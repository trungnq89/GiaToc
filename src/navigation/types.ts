import { NavigatorScreenParams } from '@react-navigation/native';
import { FamilyBranch } from '../types';

export type MainTabParamList = {
  Home: undefined;
  Generations: undefined;
  Events: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  PersonDetail: { personId: string };
  PersonForm: {
    personId?: string;
    defaultBranch?: FamilyBranch;
    defaultRelationPreset?: string;
    relatedToPersonId?: string;
  };
  EventForm: {
    eventId?: string;
    defaultPersonId?: string;
  };
  TreeExport: {
    defaultBranch?: FamilyBranch;
  };
};
