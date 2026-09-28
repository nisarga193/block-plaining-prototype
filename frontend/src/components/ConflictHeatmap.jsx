import React, { useEffect, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { getTasks } from '../api';

const nodeStyle = "px-4 py-2 shadow-md rounded-md border-2 font-semibold text-xs text-center backdrop-blur bg-slate-900/90 text-slate-100";

function colorForRatio(ratio) {
  if (ratio > 0.75) return { border: 'border-red-500', glow: 'rgba(239,68,68,0.5)', mini: '#ef4444' };
  if (ratio > 0.4) return { border: 'border-amber-500', glow: 'rgba(245,158,11,0.2)', mini: '#f59e0b' };
  return { border: 'border-emerald-500', glow: 'rgba(16,185,129,0.2)', mini: '#10b981' };
}

export default function ConflictHeatmap() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    getTasks().then((d) => {
      const tasks = d.tasks || [];
      const bySection = {};
      tasks.forEach((t) => { bySection[t.section_id] = (bySection[t.section_id] || 0) + 1; });

      const sectionIds = Object.keys(bySection).sort();
      const max = Math.max(...Object.values(bySection), 1);

      const generatedNodes = sectionIds.map((id, i) => {
        const count = bySection[id];
        const { border, glow, mini } = colorForRatio(count / max);
        return {
          id,
          position: { x: 150 + i * 200, y: 150 },
          data: { label: `${id}\n(${count} pending tasks)` },
          className: `${nodeStyle} ${border}`,
          style: { boxShadow: `0 0 15px ${glow}` },
          _miniColor: mini,
        };
      });

      const generatedEdges = sectionIds.slice(0, -1).map((id, i) => ({
        id: `e-${id}-${sectionIds[i + 1]}`,
        source: id,
        target: sectionIds[i + 1],
        animated: true,
        style: { stroke: '#475569', strokeWidth: 2 },
      }));

      setNodes(generatedNodes);
      setEdges(generatedEdges);
    });
  }, [setNodes, setEdges]);

  return (
    <div className="h-[400px] w-full rounded-lg border border-slate-800 overflow-hidden bg-[#0f172a]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#334155" gap={16} size={1} />
        <Controls className="bg-slate-800 border-slate-700 fill-slate-300" showInteractive={false} />
        <MiniMap
          nodeColor={(node) => node._miniColor || '#475569'}
          maskColor="rgba(15, 23, 42, 0.8)"
          className="bg-slate-900 border border-slate-700"
        />
      </ReactFlow>
    </div>
  );
}
