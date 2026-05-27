import { toPng } from 'html-to-image';
import type { ReactFlowInstance } from '@xyflow/react';

export async function exportPNG(flowInstance: ReactFlowInstance): Promise<void> {
  const nodes = flowInstance.getNodes();
  if (nodes.length === 0) return;

  const bounds = flowInstance.getNodesBounds(nodes);
  const padding = 60;

  const viewportEl = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewportEl) return;

  // Save current viewport
  const currentViewport = flowInstance.getViewport();

  // Compute a viewport that shows all nodes at zoom 1
  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;

  // Temporarily set viewport to show everything
  flowInstance.setViewport({
    x: -bounds.x + padding,
    y: -bounds.y + padding,
    zoom: 1,
  });

  // Wait for DOM to update
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => requestAnimationFrame(resolve));

  try {
    const dataUrl = await toPng(viewportEl, {
      backgroundColor: '#ffffff',
      width,
      height,
      pixelRatio: 2,
      cacheBust: true,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${-bounds.x + padding}px, ${-bounds.y + padding}px)`,
      },
      filter: (node) => {
        const el = node as Element;
        if (!el.classList) return true;
        return (
          !el.classList.contains('react-flow__minimap') &&
          !el.classList.contains('react-flow__controls') &&
          !el.classList.contains('react-flow__background')
        );
      },
    });

    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `org-chart-${date}.png`;
    a.click();
  } finally {
    // Restore viewport
    flowInstance.setViewport(currentViewport);
  }
}
