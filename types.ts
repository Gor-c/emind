
export interface MindMapNode {
  name: string;
  children?: MindMapNode[];
  color?: string;
  collapsed?: boolean;
  // side indicates whether the branch should be rendered on the left or right side of the root node
  side?: string;
}

export interface AppState {
  isProcessing: boolean;
  error: string | null;
  mindMapData: MindMapNode | null;
  imageUrl: string | null;
}