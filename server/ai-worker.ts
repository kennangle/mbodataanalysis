import { storage } from "./storage";
import { openaiService } from "./openai";

/**
 * Recovery function to resume processing of pending AI messages after server restart.
 * Called automatically on server startup.
 */
export async function recoverPendingMessages(): Promise<void> {
  try {
    console.log("[AI Recovery] Checking for pending messages after server restart...");
    
    const pendingMessages = await storage.getPendingConversationMessages();
    
    if (pendingMessages.length === 0) {
      console.log("[AI Recovery] No pending messages found");
      return;
    }

    console.log(`[AI Recovery] Found ${pendingMessages.length} pending message(s), resuming processing...`);
    
    for (const message of pendingMessages) {
      console.log(`[AI Recovery] Resuming message ${message.id}`);
      
      // Resume processing asynchronously
      processAIQuery(message.id).catch(error => {
        console.error(`[AI Recovery] Failed to resume message ${message.id}:`, error);
      });
    }
    
    console.log(`[AI Recovery] Successfully queued ${pendingMessages.length} message(s) for processing`);
  } catch (error) {
    console.error("[AI Recovery] Failed to recover pending messages:", error);
    // Don't abort startup if recovery fails
  }
}

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
    // This builds history UP TO the current pending message, ensuring correct message pairing
    const conversationHistory: Array<{ role: string; content: string }> = [];
    let userMessageObj = null; // Track the actual user message object for fileIds
    
    for (const msg of allMessages) {
      if (msg.id === messageId) {
        break; // Stop before the current pending message
      }
      if (msg.status === "completed") {
        conversationHistory.push({
          role: msg.role,
          content: msg.content,
        });
        // Track the last completed user message (will be the query for this pending message)
        if (msg.role === "user") {
          userMessageObj = msg;
        }
      }
    }

    // The last message in conversationHistory should be the user query
    const userMessageInHistory = conversationHistory[conversationHistory.length - 1];
    if (!userMessageInHistory || userMessageInHistory.role !== "user") {
      console.error(`[AI Worker] Could not find user query for message ${messageId}`);
      await storage.updateConversationMessageStatus(
        messageId,
        "failed",
        undefined,
        "User query not found"
      );
      return;
    }

    if (!userMessageObj) {
      console.error(`[AI Worker] Could not find user message object for message ${messageId}`);
      await storage.updateConversationMessageStatus(
        messageId,
        "failed",
        undefined,
        "User message object not found"
      );
      return;
    }

    const userQuery = userMessageInHistory.content;
    
    // Build conversation history excluding the current user query
    const historyWithoutCurrentQuery = conversationHistory.slice(0, -1);

    console.log(`[AI Worker] Processing query: "${userQuery.substring(0, 50)}..."`);

    // Get fileIds from the user message (if any were uploaded)
    const fileIdsToProcess = userMessageObj.fileIds?.join(',') || "";
    
    if (fileIdsToProcess) {
      console.log(`[AI Worker] Processing with ${userMessageObj.fileIds?.length} attached files`);
    }

    // Call OpenAI service with file context
    const result = await openaiService.generateInsight(
      conversation.organizationId,
      conversation.userId,
      userQuery,
      historyWithoutCurrentQuery,
      fileIdsToProcess
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
