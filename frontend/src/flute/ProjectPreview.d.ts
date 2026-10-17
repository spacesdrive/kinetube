// types for ProjectPreview.jsx, which `npx flute init` and `npx flute sync` generate and own (ADR-038)
import type { ReactNode } from 'react';

export interface FluteProjectPreviewProps {
  children: ReactNode;
  enabled: boolean;
  active?: boolean;
}

export declare function FluteProjectPreview(props: FluteProjectPreviewProps): ReactNode;
