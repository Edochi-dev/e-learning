/** Whether a course is tied to students' purchases or access. */
export abstract class CourseUsageGateway {
  abstract hasEnrollmentsOrOrders(courseId: string): Promise<boolean>;
}
