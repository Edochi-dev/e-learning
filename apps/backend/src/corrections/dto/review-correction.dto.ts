import { IsIn } from 'class-validator';

/**
 * Multipart fields of a review; the voice note arrives as the `audio` file.
 * `action` is transport-only: the domain stores 'approved' / 'rejected'.
 */
export class ReviewCorrectionDto {
  @IsIn(['approve', 'reject'], {
    message: 'action must be either "approve" or "reject"',
  })
  action: 'approve' | 'reject';
}
