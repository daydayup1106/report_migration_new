import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService } from '@/services/api';
import type { UploadResponse } from '@/types';

export type UploadStage = 'idle' | 'uploading' | 'pending' | 'confirming' | 'success' | 'error';

interface UploadState {
  stage: UploadStage;
  file: File | null;
  result: UploadResponse | null;
  error: string | null;
  sessionId: string | null;
}

export function useUpload() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<UploadState>({
    stage: 'idle',
    file: null,
    result: null,
    error: null,
    sessionId: null,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => reportService.uploadExcel(file),
    onSuccess: (data) => {
      if (data.pending) {
        // Has errors/warnings — waiting for user confirmation
        setState((s) => ({
          ...s,
          stage: 'pending',
          result: data,
          error: null,
          sessionId: data.sessionId || null,
        }));
      } else {
        // No issues — saved successfully
        setState((s) => ({ ...s, stage: 'success', result: data, error: null }));
        qc.invalidateQueries({ queryKey: ['reports'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
      }
    },
    onError: (err: Error) => {
      setState((s) => ({
        ...s,
        stage: 'error',
        error: err.message || 'Upload failed. Please try again.',
      }));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (sessionId: string) => reportService.confirmUpload(sessionId),
    onSuccess: (data) => {
      setState((s) => ({ ...s, stage: 'success', result: data, error: null, sessionId: null }));
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: Error) => {
      setState((s) => ({
        ...s,
        stage: 'error',
        error: err.message || 'Confirmation failed. Please try again.',
      }));
    },
  });

  // ─── Validation ──────────────────────────────────────────
  const validate = useCallback((file: File): string | null => {
    const validExts = ['.xlsx', '.xls'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExts.includes(ext)) return 'Only .xlsx and .xls files are supported.';
    if (file.size > 10 * 1024 * 1024) return 'File size exceeds 10MB limit.';
    return null;
  }, []);

  // ─── Upload ──────────────────────────────────────────────
  const upload = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setState({ stage: 'error', file, result: null, error: err, sessionId: null });
        return;
      }
      setState({ stage: 'uploading', file, result: null, error: null, sessionId: null });
      uploadMutation.mutate(file);
    },
    [validate, uploadMutation],
  );

  // ─── Confirm and Save ────────────────────────────────────
  const confirm = useCallback(() => {
    if (!state.sessionId) {
      setState((s) => ({
        ...s,
        stage: 'error',
        error: 'No session ID found. Please re-upload the file.',
      }));
      return;
    }
    setState((s) => ({ ...s, stage: 'confirming' }));
    confirmMutation.mutate(state.sessionId);
  }, [state.sessionId, confirmMutation]);

  // ─── Drag & Drop Handlers ───────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload],
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      // Reset input so same file can be re-selected
      e.target.value = '';
    },
    [upload],
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ─── Reset ──────────────────────────────────────────────
  const reset = useCallback(() => {
    setState({ stage: 'idle', file: null, result: null, error: null, sessionId: null });
  }, []);

  return {
    ...state,
    isUploading: state.stage === 'uploading',
    isPending: state.stage === 'pending',
    isConfirming: state.stage === 'confirming',
    fileInputRef,
    upload,
    confirm,
    reset,
    onDragOver,
    onDrop,
    onFileSelect,
    openFilePicker,
  };
}
