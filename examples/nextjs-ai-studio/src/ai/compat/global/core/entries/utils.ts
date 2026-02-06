import { getNanoid } from '../../common/string/tools';
import {
  DEFAULT_ENTRY_VALUES,
  ENTRY_URL_PREFIX,
  ENTRY_URL_SEPARATOR,
  ENTRY_VALIDATION_RULES
} from './constants';
import type { ChatEntry, ChatEntryParameter, CreateEntryData, UpdateEntryData } from './type';

// Validation functions
export const validateEntryName = (name?: string): string | null => {
  if (!name || name.trim().length === 0) {
    return 'Name is required';
  }
  if (name.length < ENTRY_VALIDATION_RULES.name.minLength) {
    return `Name must be at least ${ENTRY_VALIDATION_RULES.name.minLength} characters`;
  }
  if (name.length > ENTRY_VALIDATION_RULES.name.maxLength) {
    return `Name must be no more than ${ENTRY_VALIDATION_RULES.name.maxLength} characters`;
  }
  return null;
};

export const validateEntryUrl = (url: string): string | null => {
  if (!url || url.trim().length === 0) {
    return 'URL is required';
  }
  if (!ENTRY_VALIDATION_RULES.url.pattern.test(url)) {
    return 'URL can only contain letters, numbers, hyphens, and underscores';
  }
  if (url.length > ENTRY_VALIDATION_RULES.url.maxLength) {
    return `URL must be no more than ${ENTRY_VALIDATION_RULES.url.maxLength} characters`;
  }
  return null;
};

export const validateEntryDescription = (description?: string): string | null => {
  if (description && description.length > ENTRY_VALIDATION_RULES.description.maxLength) {
    return `Description must be no more than ${ENTRY_VALIDATION_RULES.description.maxLength} characters`;
  }
  return null;
};

export const validateCreateEntryData = (data: CreateEntryData): string[] => {
  const errors: string[] = [];

  const nameError = validateEntryName(data.name);
  if (nameError) errors.push(nameError);

  const descriptionError = validateEntryDescription(data.description);
  if (descriptionError) errors.push(descriptionError);

  return errors;
};

export const validateUpdateEntryData = (data: UpdateEntryData): string[] => {
  const errors: string[] = [];

  if (data.name !== undefined) {
    const nameError = validateEntryName(data.name);
    if (nameError) errors.push(nameError);
  }

  if (data.description !== undefined) {
    const descriptionError = validateEntryDescription(data.description);
    if (descriptionError) errors.push(descriptionError);
  }

  return errors;
};

// Validation for publishing (requires app selection)
export const validateEntryForPublishing = (entry: ChatEntry): string[] => {
  const errors: string[] = [];

  if (!entry.apps || entry.apps.length === 0) {
    errors.push('App selection is required for publishing');
  }

  return errors;
};

// URL generation utilities
export const generateEntryUrl = (title: string): string => {
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, ENTRY_URL_SEPARATOR) // Replace spaces with separator
    .replace(/-+/g, ENTRY_URL_SEPARATOR) // Replace multiple separators with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing separators

  const shortId = getNanoid(6);
  return `${ENTRY_URL_PREFIX}${ENTRY_URL_SEPARATOR}${cleanTitle}${ENTRY_URL_SEPARATOR}${shortId}`;
};

export const isValidEntryUrl = (url: string): boolean => {
  return validateEntryUrl(url) === null;
};

// Helper functions for working with entries
export const getEntryDisplayUrl = (entry: ChatEntry): string => {
  return `/chat/entry/${entry.url}`;
};

export const getEntryShareUrl = (entry: ChatEntry, baseUrl?: string): string => {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/chat/entry/${entry.url}`;
};

export const isEntryExpired = (entry: ChatEntry): boolean => {
  if (!entry.shareSettings.expirationTime) {
    return false;
  }
  return new Date() > entry.shareSettings.expirationTime;
};
