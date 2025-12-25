
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import { MindMapNode } from '../types';

interface Props {
  data: MindMapNode;
}

export interface MindMapCanvasRef {
  exportImage: () => void;
}

const MindMapCanvas = forwardRef<MindMapCanvasRef, Props>(({ data }, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  // 暴露导出方法给父组件
  useImperativeHandle(ref, () => ({
    exportImage: () => {
      if (!svgRef.current) return;

      const svg = svgRef.current;
      const g = svg.querySelector('g');
      if (!g) return;

      // 1. 获取内容的真实边界
      const bbox = g.getBBox();
      const padding = 50;
      const width = bbox.width + padding * 2;
      const height = bbox.height + padding * 2;

      // 2. 克隆 SVG 避免干扰当前视图
      const clone = svg.cloneNode(true) as SVGSVGElement;
      const cloneG = clone.querySelector('g');
      if (!cloneG) return;

      // 移除缩放和平移，将内容对齐到 (padding, padding)
      cloneG.setAttribute('transform', `translate(${-bbox.x + padding}, ${-bbox.y + padding})`);
      clone.setAttribute('width', width.toString());
      clone.setAttribute('height', height.toString());
      clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
      
      // 显式添加背景色样式
      clone.style.backgroundColor = 'white';

      // 3. 序列化 XML
      const serializer = new XMLSerializer();
      const svgXml = serializer.serializeToString(clone);
      const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // 4. 绘制到 Canvas
      const canvas = document.createElement('canvas');
      const scale = 2; // 2倍分辨率
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          
          // 5. 触发下载
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `VisionMind_${data.name}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }
    }
  }));

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.01, 10])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    const rootHierarchy = d3.hierarchy(data);
    const totalNodes = rootHierarchy.descendants().length;
    
    const vSpacing = Math.max(35, 60 - Math.min(25, totalNodes / 20));
    const hSpacing = Math.max(180, 220 + (totalNodes / 5));

    const treeLayout = d3.tree<MindMapNode>().nodeSize([vSpacing, hSpacing]);

    const children = data.children || [];
    let leftSideNodes = children.filter(c => c.side === 'left');
    let rightSideNodes = children.filter(c => c.side !== 'left');

    if (leftSideNodes.length === 0 && rightSideNodes.length > 3) {
      const mid = Math.ceil(rightSideNodes.length / 2);
      leftSideNodes = rightSideNodes.slice(0, mid);
      rightSideNodes = rightSideNodes.slice(mid);
    }

    const buildTree = (branches: MindMapNode[]) => {
      const root = d3.hierarchy({ ...data, children: branches });
      treeLayout(root);
      return root;
    };

    const rootR = buildTree(rightSideNodes);
    const rootL = buildTree(leftSideNodes);

    rootL.descendants().forEach(d => { if (d.depth > 0) d.y = -d.y; });

    const allNodes = [...rootR.descendants(), ...rootL.descendants().filter(d => d.depth > 0)];
    const allLinks = [...rootR.links(), ...rootL.links().filter(l => l.source.depth > 0 || l.target.depth > 0)];

    const linkGenerator = d3.linkHorizontal<any, any>()
      .x(d => d.y)
      .y(d => d.x);

    g.selectAll(".link")
      .data(allLinks)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", linkGenerator as any)
      .style("fill", "none")
      .style("stroke", d => (d.target.data as MindMapNode).color || "#94a3b8")
      .style("stroke-width", d => Math.max(0.8, 5 - d.source.depth * 1) + "px")
      .style("stroke-opacity", 0.4);

    const node = g.selectAll(".node")
      .data(allNodes)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    node.each(function(d: any) {
      const el = d3.select(this);
      const nd = d.data as MindMapNode;
      const isRoot = d.depth === 0;
      const isLeft = d.y < 0;
      const themeColor = nd.color || "#6366f1";

      if (isRoot) {
        const textLen = nd.name.length;
        const rw = Math.max(150, textLen * 22);
        el.append("rect")
          .attr("x", -rw / 2)
          .attr("y", -28)
          .attr("width", rw)
          .attr("height", 56)
          .attr("rx", 28)
          .attr("fill", themeColor)
          .style("filter", "drop-shadow(0 6px 15px rgba(0,0,0,0.2))");

        el.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .style("fill", "#fff")
          .style("font-weight", "bold")
          .style("font-size", "22px")
          .text(nd.name);
      } else {
        const isLeaf = !nd.children || nd.children.length === 0;
        
        el.append("circle")
          .attr("r", isLeaf ? 3 : Math.max(4, 7 - d.depth))
          .style("fill", isLeaf ? themeColor : "#fff")
          .style("stroke", themeColor)
          .style("stroke-width", "2px");

        const label = el.append("text")
          .attr("dy", "0.35em")
          .attr("x", isLeft ? -12 : 12)
          .attr("text-anchor", isLeft ? "end" : "start")
          .text(nd.name)
          .style("font-size", Math.max(11, 15 - d.depth) + "px")
          .style("font-weight", d.depth < 3 ? "600" : "400")
          .style("fill", "#334155");

        label.clone(true).lower()
          .attr("stroke", "#f8fafc")
          .attr("stroke-width", 4)
          .style("stroke-opacity", 0.9);
      }
    });

    const gBox = g.node()?.getBBox();
    if (gBox) {
      const scale = 0.9 / Math.max(gBox.width / width, gBox.height / height);
      const fitScale = Math.min(Math.max(scale, 0.05), 1.0);
      
      const centerX = width / 2 - (gBox.x + gBox.width / 2) * fitScale;
      const centerY = height / 2 - (gBox.y + gBox.height / 2) * fitScale;

      svg.transition().duration(1000).call(
        zoomBehavior.transform,
        d3.zoomIdentity.translate(centerX, centerY).scale(fitScale)
      );
    }

    return () => {
      svg.selectAll("*").remove();
    };
  }, [data]);

  const resetView = () => {
    if (!svgRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    svg.transition().duration(800).call(
      (d3.zoom() as any).transform,
      d3.zoomIdentity.translate(width/2, height/2).scale(0.5)
    );
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#f8fafc] overflow-hidden">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
      
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <button 
          onClick={resetView}
          className="p-3 bg-white border border-slate-200 rounded-xl shadow-lg hover:bg-slate-50 transition-all text-slate-600"
          title="Reset Zoom"
        >
          <i className="fas fa-home"></i>
        </button>
        <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-black text-indigo-600 shadow-sm">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">节点总数</p>
          <p className="text-sm font-black text-slate-700">
            {d3.hierarchy(data).descendants().length} 节点
          </p>
        </div>
      </div>
    </div>
  );
});

export default MindMapCanvas;
