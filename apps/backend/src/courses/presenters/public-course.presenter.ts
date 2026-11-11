import { PublicCourse, PublicLesson } from '@maris-nails/shared';
import { Course } from '../entities/course.entity';
import { Lesson } from '../entities/lessons.entity';
import { videoProviderOf } from '../domain/video-provider';

/**
 * Builds the public view of a course by copying an explicit allow-list of
 * fields. Do not switch to spreading the entity and deleting the secrets: a
 * field added to the entity later would then leak by default.
 */
export function toPublicCourse(course: Course): PublicCourse {
  return {
    id: course.id,
    title: course.title,
    price: Number(course.price),
    description: course.description,
    thumbnailUrl: course.thumbnailUrl ?? undefined,
    category: course.category ?? undefined,
    level: course.level ?? undefined,
    accessDurationDays: course.accessDurationDays ?? null,
    features: course.features ?? undefined,
    lessons: (course.lessons ?? []).map(toPublicLesson),
  };
}

function toPublicLesson(lesson: Lesson): PublicLesson {
  const video = lesson.videoData;
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    type: lesson.type,
    order: lesson.order,
    videoData: video
      ? {
          provider: video.videoUrl
            ? videoProviderOf(video.videoUrl)
            : undefined,
          duration: video.duration ?? undefined,
          isLive: video.isLive,
          liveStartsAt: video.liveStartsAt?.toISOString(),
          liveEndsAt: video.liveEndsAt?.toISOString(),
        }
      : undefined,
    examData: lesson.examData
      ? { passingScore: lesson.examData.passingScore }
      : undefined,
    assignmentData: lesson.assignmentData
      ? {
          referenceImageUrl: lesson.assignmentData.referenceImageUrl,
          instructions: lesson.assignmentData.instructions,
        }
      : undefined,
  };
}
