export interface ChatInputFile {
  id: string;
  file: File;
}

export interface ChatInputSubmitPayload {
  text: string;
  files: ChatInputFile[];
}

export interface ChatInputModelOption {
  value: string;
  label: string;
  icon?: string;
}

export interface ChatInputProps {
  isSending: boolean;
  model: string;
  modelOptions: ChatInputModelOption[];
  modelLoading?: boolean;
  onChangeModel: (model: string) => void;
  onStop?: () => void;
  onSend: (payload: ChatInputSubmitPayload) => Promise<void> | void;
}
