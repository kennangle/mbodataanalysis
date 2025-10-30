import { storage } from "./storage";
import { openaiService } from "./openai";

/**
 * Background worker function to process AI queries asynchronously.
 * This allows users to navigate away while the query is being processed.
 * 
 * @param messageId - The ID of the assistant message with status="pending"
 */
export async function processAIQuery(messageId: string): Promise<void> {
  try {
    console.log(`[AI Worker] Starting background processing for message ${messageId}`);

    // Get the pending message
    const message = await storage.getConversationMessage(messageId);
    if (!message) {
      console.error(`[AI Worker] Message ${messageId} not found`);
      return;
    }

    if (message.role !== "assistant") {
      console.error(`[AI Worker] Message ${messageId} is not an assistant message`);
      return;
    }

    if (message.status !== "pending") {
      console.log(`[AI Worker] Message ${messageId} is not pending (status: ${message.status})`);
      return;
    }

    // Get the conversation to retrieve organization and user IDs
    const conversation = await storage.getConversation(message.conversationId);
    if (!conversation) {
      console.error(`[AI Worker] Conversation ${message.conversationId} not found`);
      await storage.updateConversationMessageStatus(
        messageId,
        "failed",
        undefined,
        "Conversation not found"
      );
      return;
    }

    // Get all messages in the conversation up to this point
    const allMessages = await storage.getConversationMessages(message.conversationId);
    
    // Build conversation history (exclude the current pending message)
    const conversationHistory: Array<{ role: string; content: string }> = [];
    for (const msg of allMessages) {
      if (msg.id === messageId) {
        break; // Stop before the current pending message
      }
      if (msg.status === "completed") {
        conversationHistory.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Find the user query (should be the last message before this assistant message)
    const userMessage = conversationHistory[conversationHistory.length - 1];
    if (!userMessage || userMessage.role !== "user") {
      console.error(`[AI Worker] Could not find user query for message ${messageId}`);
      await storage.updateConversationMessageStatus(
        messageId,
        "failed",
        undefined,
        "User query not found"
      );
      return;
    }

    const userQuery = userMessage.content;
    // Remove the user query from history since it will be passed separately
    const historyWithoutCurrentQuery = conversationHistory.slice(0, -1);

    console.log(`[AI Worker] Processing query: "${userQuery.substring(0, 50)}..."`);

    // Call OpenAI service
    const result = await openaiService.generateInsight(
      conversation.organizationId,
      conversation.userId,
      userQuery,
      historyWithoutCurrentQuery,
      "" // No file context for background processing
    );

    console.log(`[AI Worker] OpenAI response received, tokens used: ${result.tokensUsed}`);

    // Update the message with the response
    await storage.updateConversationMessageStatus(
      messageId,
      "completed",
      result.response,
      undefined
    );

    // Update conversation timestamp
    await storage.updateConversation(message.conversationId, {});

    console.log(`[AI Worker] Successfully completed processing for message ${messageId}`);
  } catch (error) {
    console.error(`[AI Worker] Error processing message ${messageId}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    // Update the message with failed status and error
    await storage.updateConversationMessageStatus(
      messageId,
      "failed",
      undefined,
      errorMessage
    );
  }
}
