import { API_KEYS } from '../constants/api-keys.const';
import { IScreenInput, IScreenOutput } from '../interfaces/screen.interface';

export const HomeScreenAPI = ({ actor }: IScreenInput): IScreenOutput => ({
  [API_KEYS.NEWSFEED]: actor.getNewsfeed(),
});
