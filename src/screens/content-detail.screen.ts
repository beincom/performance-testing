import { API_KEYS } from '../constants/api-keys.const';
import { IScreenInput, IScreenOutput } from '../interfaces/screen.interface';

export const ContentDetailScreenAPI = ({
  actor,
  contentId,
  contentType,
}: IScreenInput): IScreenOutput => ({
  [API_KEYS.CONTENT_DETAIL]: actor.getContentDetail(contentId, contentType),
});
