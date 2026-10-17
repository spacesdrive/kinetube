"use client";
import React from "react";
import { ProjectPreview } from "@webprodigies/flute/preview";
import { sceneModules } from "./catalog";
// Host-owned development flag: no process, Vite or Electron globals in this adapter.
export function FluteProjectPreview({ children, enabled, active, ...props }) {
  if (!enabled) return children;
  return <ProjectPreview {...props} projectId="3e93cf31-3f96-449b-8277-ae70d41c3692" enabled={enabled} active={active} sceneModules={sceneModules}>{children}</ProjectPreview>;
}
