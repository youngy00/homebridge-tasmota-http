import { ManagedDevice } from './device-manager';

export interface UiService {

  scan(): Promise<ManagedDevice[]>;

  import(host: string): Promise<void>;

}