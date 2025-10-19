import { storage } from "./storage";

export async function createSampleData(organizationId: string) {
  const sampleStudents = [
    {
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah@example.com",
      phone: "555-0101",
      status: "active" as const,
      membershipType: "Unlimited",
    },
    {
      firstName: "Michael",
      lastName: "Chen",
      email: "michael@example.com",
      phone: "555-0102",
      status: "active" as const,
      membershipType: "Monthly 10",
    },
    {
      firstName: "Emily",
      lastName: "Rodriguez",
      email: "emily@example.com",
      phone: "555-0103",
      status: "active" as const,
      membershipType: "Unlimited",
    },
    {
      firstName: "David",
      lastName: "Patel",
      email: "david@example.com",
      phone: "555-0104",
      status: "inactive" as const,
      membershipType: "Drop-in",
    },
    {
      firstName: "Jessica",
      lastName: "Williams",
      email: "jessica@example.com",
      phone: "555-0105",
      status: "active" as const,
      membershipType: "Monthly 10",
    },
  ];

  const sampleClasses = [
    {
      name: "Vinyasa Flow",
      description: "Dynamic flowing yoga practice",
      duration: 60,
      capacity: 20,
    },
    { name: "Yin Yoga", description: "Deep stretch and relaxation", duration: 75, capacity: 15 },
    { name: "Power Yoga", description: "Strength building yoga", duration: 60, capacity: 18 },
    { name: "Meditation", description: "Guided meditation session", duration: 30, capacity: 25 },
  ];

  let studentsCreated = 0;
  let classesCreated = 0;
  let attendanceCreated = 0;
  let revenueCreated = 0;

  // Create students
  for (const student of sampleStudents) {
    try {
      await storage.createStudent({
        organizationId,
        ...student,
        joinDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
      });
      studentsCreated++;
    } catch (error) {
      console.error("Error creating student:", error);
    }
  }

  // Create classes
  for (const cls of sampleClasses) {
    try {
      await storage.createClass({
        organizationId,
        ...cls,
        instructorName: "Jane Smith",
      });
      classesCreated++;
    } catch (error) {
      console.error("Error creating class:", error);
    }
  }

  // Get created students and classes
  const students = await storage.getStudents(organizationId, 100, 0);
  const classes = await storage.getClasses(organizationId);

  // Create class schedules and attendance records
  const schedules = [];
  const now = new Date();

  for (const cls of classes) {
    for (let i = 0; i < 15; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startTime = new Date(date);
      startTime.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
      const endTime = new Date(startTime.getTime() + (cls.duration || 60) * 60 * 1000);

      try {
        const schedule = await storage.createClassSchedule({
          organizationId,
          classId: cls.id,
          startTime,
          endTime,
          location: "Main Studio",
        });
        schedules.push(schedule);
      } catch (error) {
        console.error("Error creating schedule:", error);
      }
    }
  }

  // Create attendance records
  for (const schedule of schedules) {
    for (const student of students.slice(0, Math.floor(Math.random() * students.length) + 1)) {
      try {
        await storage.createAttendance({
          organizationId,
          studentId: student.id,
          scheduleId: schedule.id,
          attendedAt: schedule.startTime,
          status: Math.random() > 0.1 ? "attended" : "absent",
        });
        attendanceCreated++;
      } catch (error) {
        console.error("Error creating attendance:", error);
      }
    }
  }

  // Create revenue records
  const revenueTypes = ["membership", "class-pack", "drop-in", "workshop"] as const;
  for (let i = 0; i < 20; i++) {
    const date = new Date(now.getTime() - Math.random() * 60 * 24 * 60 * 60 * 1000);
    const student = students[Math.floor(Math.random() * students.length)];

    try {
      await storage.createRevenue({
        organizationId,
        studentId: student.id,
        amount: (Math.floor(Math.random() * 150) + 50).toString(),
        type: revenueTypes[Math.floor(Math.random() * revenueTypes.length)],
        transactionDate: date,
        description: "Sample payment",
      });
      revenueCreated++;
    } catch (error) {
      console.error("Error creating revenue:", error);
    }
  }

  return {
    students: studentsCreated,
    classes: classesCreated,
    attendance: attendanceCreated,
    revenue: revenueCreated,
  };
}
