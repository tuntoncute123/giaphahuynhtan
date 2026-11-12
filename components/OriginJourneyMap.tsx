'use client';

import { useEffect, useRef, useState } from 'react';
import vietnamOutline from '@/data/vietnam-outline.json';
import originData from '@/data/origin-story.json';
import styles from './OriginStory.module.css';

// Approximate regional anchors; the documents do not give surveyed coordinates.
const PLACES = {
  thanhHoa: { lon: 105.35, lat: 19.8 },
  nhuongBan: { lon: 106.3, lat: 18.12 },
  haiVan: { lon: 108.1, lat: 16.2 },
  langCo: { lon: 108.08, lat: 16.23 },
  banThach: { lon: 108.23, lat: 15.82 },
  haQuan: { lon: 108.53, lat: 15.55 },
  nuiRuon: { lon: 108.3, lat: 15.73 },
  tanHy: { lon: 108.77, lat: 15.27 },
  sonTra: { lon: 108.82, lat: 15.25 },
  duyPhuoc: { lon: 108.25, lat: 15.84 }
} as const;
type PlaceId = keyof typeof PLACES;
const PLACE_NAMES: Record<PlaceId, string> = {
  thanhHoa: 'Xuân Thọ – Sơn Lam', nhuongBan: 'Nhượng Bạn', haiVan: 'Ngoài đèo Hải Vân',
  langCo: 'Lăng Cô', banThach: 'Bàn Thạch', haQuan: 'Cát Cạo · Hà Quan',
  nuiRuon: 'Núi Rướn', tanHy: 'Tân Hy', sonTra: 'Sơn Trà', duyPhuoc: 'Duy Phước'
};

const SCENES = originData.chapters.map((chapter, index) => ({
  label: chapter.shortLabel,
  title: chapter.title,
  chapter: index,
  summary: chapter.summary,
  facts: chapter.details.map(detail => `${detail.label}: ${detail.value}`),
  evidence: chapter.evidence,
  source: chapter.sourceRef
}));

type Point = { x: number; y: number };
type Projection = (lon: number, lat: number) => Point;

function projector(width: number, height: number): Projection {
  const scale = Math.min((height - 30) / 15.6, (width - 42) / 7.8);
  const centerX = width * 0.52;
  const centerY = height * 0.5;
  return (lon, lat) => ({
    x: centerX + (lon - 105.8) * scale,
    y: centerY + (15.9 - lat) * scale
  });
}

function setupCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return context;
}

function drawLand(context: CanvasRenderingContext2D, width: number, height: number, project: Projection) {
  context.clearRect(0, 0, width, height);

  const grid = context.createLinearGradient(0, 0, width, height);
  grid.addColorStop(0, 'rgba(255,250,229,.68)');
  grid.addColorStop(1, 'rgba(224,237,218,.75)');
  context.fillStyle = grid;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = 'rgba(72,118,103,.12)';
  context.lineWidth = 1;
  for (let lat = 9; lat <= 23; lat += 2) {
    const y = project(105.8, lat).y;
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }
  for (let lon = 103; lon <= 109; lon += 2) {
    const x = project(lon, 15.9).x;
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
  }

  const shape = new Path2D();
  for (const polygon of vietnamOutline.polygons) {
    for (const ring of polygon) {
      ring.forEach(([lon, lat], index) => {
        const { x, y } = project(lon, lat);
        if (index === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
      shape.closePath();
    }
  }
  context.save();
  context.shadowColor = 'rgba(47,63,43,.25)';
  context.shadowBlur = 16;
  context.shadowOffsetY = 7;
  context.fillStyle = '#71916c';
  context.fill(shape, 'evenodd');
  context.restore();

  const land = context.createLinearGradient(width * .3, 0, width * .7, height);
  land.addColorStop(0, 'rgba(220,217,145,.78)');
  land.addColorStop(.5, 'rgba(124,155,105,.54)');
  land.addColorStop(1, 'rgba(57,105,82,.52)');
  context.fillStyle = land;
  context.fill(shape, 'evenodd');
  context.strokeStyle = '#365d4a';
  context.lineWidth = 1.2;
  context.stroke(shape);
}

type Route = { from: PlaceId; to: PlaceId; tone: 'journey' | 'branch' | 'memory'; sea?: boolean };
const ROUTES: Route[][] = [
  [{ from: 'thanhHoa', to: 'nhuongBan', tone: 'journey' }],
  [],
  [
    { from: 'nhuongBan', to: 'haiVan', tone: 'journey', sea: true },
    { from: 'haiVan', to: 'langCo', tone: 'memory' },
    { from: 'haiVan', to: 'banThach', tone: 'memory' },
    { from: 'haiVan', to: 'haQuan', tone: 'journey' }
  ],
  [],
  [{ from: 'haQuan', to: 'nuiRuon', tone: 'branch' }],
  [
    { from: 'haQuan', to: 'nuiRuon', tone: 'branch' },
    { from: 'haQuan', to: 'tanHy', tone: 'journey' },
    { from: 'haQuan', to: 'sonTra', tone: 'branch' }
  ],
  [],
  [],
  [],
  []
];
const MARKERS: PlaceId[][] = [
  ['thanhHoa', 'nhuongBan'],
  ['nhuongBan'],
  ['nhuongBan', 'haiVan', 'langCo', 'banThach', 'haQuan'],
  ['haQuan'],
  ['haQuan', 'nuiRuon'],
  ['haQuan', 'nuiRuon', 'tanHy', 'sonTra'],
  ['haQuan'],
  ['haQuan', 'duyPhuoc'],
  ['haQuan', 'tanHy'],
  ['haQuan', 'tanHy']
];

function routePoints(route: Route, project: Projection): Point[] {
  const start = project(PLACES[route.from].lon, PLACES[route.from].lat);
  const end = project(PLACES[route.to].lon, PLACES[route.to].lat);
  const control = route.sea
    ? { x: Math.max(start.x, end.x) + 65, y: (start.y + end.y) / 2 }
    : { x: (start.x + end.x) / 2 + (route.tone === 'branch' ? -14 : 14), y: (start.y + end.y) / 2 };
  return Array.from({ length: 41 }, (_, index) => {
    const t = index / 40;
    return {
      x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x,
      y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y
    };
  });
}

function drawRoute(context: CanvasRenderingContext2D, route: Route, project: Projection, progress: number) {
  const points = routePoints(route, project);
  const color = route.tone === 'branch' ? '#bd843e' : route.tone === 'memory' ? '#8b7180' : '#9b3428';
  context.save();
  context.beginPath();
  points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
  context.strokeStyle = 'rgba(106,74,54,.48)'; context.lineWidth = 2; context.setLineDash([4, 6]); context.stroke();
  context.restore();
  if (progress <= 0) return;
  const visible = Math.min(points.length - 1, Math.ceil(progress * (points.length - 1)));
  context.beginPath(); context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i <= visible; i++) context.lineTo(points[i].x, points[i].y);
  context.strokeStyle = color; context.lineWidth = route.tone === 'journey' ? 4 : 2.6;
  context.lineCap = 'round'; context.lineJoin = 'round'; context.stroke();
  if (route.sea && progress > 0 && progress < 1) {
    const boat = points[visible];
    context.save(); context.translate(boat.x, boat.y);
    context.fillStyle = '#fff3d3'; context.strokeStyle = '#8e3227'; context.lineWidth = 1.8;
    context.beginPath(); context.moveTo(-9, 3); context.lineTo(9, 3); context.lineTo(5, 9); context.lineTo(-5, 9); context.closePath(); context.fill(); context.stroke();
    context.beginPath(); context.moveTo(0, 2); context.lineTo(0, -12); context.lineTo(7, 1); context.closePath(); context.fill(); context.stroke();
    context.restore();
  }
}

function drawMarker(context: CanvasRenderingContext2D, point: Point, index: number, offset: Point = { x: 0, y: 0 }) {
  const pin = { x: point.x + offset.x, y: point.y + offset.y };
  if (offset.x || offset.y) {
    context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(pin.x, pin.y);
    context.strokeStyle = 'rgba(92,63,45,.62)'; context.lineWidth = 1.2; context.stroke();
    context.beginPath(); context.arc(point.x, point.y, 3, 0, Math.PI * 2);
    context.fillStyle = '#6b4931'; context.fill();
  }
  context.beginPath(); context.arc(pin.x, pin.y, 11, 0, Math.PI * 2);
  context.fillStyle = '#fff6db'; context.fill(); context.lineWidth = 2; context.strokeStyle = '#a23c2d'; context.stroke();
  context.fillStyle = '#783023'; context.font = '800 11px "Nunito Sans", sans-serif';
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(String(index + 1), pin.x, pin.y + .5);
}

function drawBadge(context: CanvasRenderingContext2D, x: number, y: number, label: string, dark = false) {
  const width = Math.min(170, Math.max(78, label.length * 6.1 + 20));
  context.beginPath(); context.roundRect(x, y, width, 26, 6);
  context.fillStyle = dark ? '#244d38' : 'rgba(255,249,228,.97)'; context.fill();
  context.strokeStyle = dark ? '#244d38' : 'rgba(116,85,45,.55)'; context.lineWidth = 1; context.stroke();
  context.fillStyle = dark ? '#fff3d2' : '#35503a';
  context.textAlign = 'left'; context.textBaseline = 'middle'; context.font = '800 10px "Nunito Sans", sans-serif';
  context.fillText(label, x + 9, y + 13, width - 17);
}

function drawFleet(context: CanvasRenderingContext2D, width: number, height: number) {
  const startX = width * .61;
  const y = height * .12;
  for (let index = 0; index < 5; index++) {
    const x = startX + index * 18;
    context.fillStyle = index >= 3 ? 'rgba(129,83,72,.55)' : '#8f3b2d';
    context.beginPath(); context.moveTo(x, y + 10); context.lineTo(x + 14, y + 10);
    context.lineTo(x + 11, y + 14); context.lineTo(x + 3, y + 14); context.closePath(); context.fill();
    context.beginPath(); context.moveTo(x + 7, y + 9); context.lineTo(x + 7, y - 5);
    context.lineTo(x + 12, y + 8); context.closePath(); context.fill();
    if (index >= 3) {
      context.strokeStyle = '#ad352c'; context.lineWidth = 2;
      context.beginPath(); context.moveTo(x - 1, y - 6); context.lineTo(x + 16, y + 16);
      context.moveTo(x + 16, y - 6); context.lineTo(x - 1, y + 16); context.stroke();
    }
  }
}

function drawRooster(context: CanvasRenderingContext2D, width: number, height: number) {
  const x = width * .72;
  const y = height * .18;
  context.save();
  context.translate(x, y);
  context.fillStyle = '#a23c2d';
  for (const [dx, dy] of [[-9, -19], [0, -24], [9, -19]]) {
    context.beginPath(); context.arc(dx, dy, 7, 0, Math.PI * 2); context.fill();
  }
  context.fillStyle = '#f7e0a6';
  context.beginPath(); context.arc(0, 0, 18, 0, Math.PI * 2); context.fill();
  context.strokeStyle = '#7e4931'; context.lineWidth = 2; context.stroke();
  context.fillStyle = '#603c2b';
  context.beginPath(); context.arc(6, -3, 2, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#d39243';
  context.beginPath(); context.moveTo(17, 0); context.lineTo(29, 5); context.lineTo(17, 9); context.closePath(); context.fill();
  context.restore();
  drawBadge(context, Math.max(8, x - 54), y + 33, 'GÀ GÁY BÁO NẠN', true);
}

function drawStorm(context: CanvasRenderingContext2D, point: Point) {
  const x = point.x + 43;
  const y = point.y - 16;
  context.fillStyle = 'rgba(69,80,78,.8)';
  for (const [dx, dy, radius] of [[0, 0, 13], [12, -5, 17], [26, 0, 12]]) {
    context.beginPath(); context.arc(x + dx, y + dy, radius, 0, Math.PI * 2); context.fill();
  }
  context.fillStyle = '#d5a147';
  context.beginPath(); context.moveTo(x + 14, y + 10); context.lineTo(x + 6, y + 29);
  context.lineTo(x + 15, y + 26); context.lineTo(x + 9, y + 41);
  context.lineTo(x + 26, y + 18); context.lineTo(x + 17, y + 20); context.closePath(); context.fill();
}

function drawSettlement(context: CanvasRenderingContext2D, point: Point, width: number) {
  const x = Math.min(width - 55, point.x + 58);
  const y = point.y + 14;
  context.strokeStyle = '#447c83'; context.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    context.beginPath(); context.moveTo(x - 22, y + 28 + i * 6);
    context.quadraticCurveTo(x - 10, y + 22 + i * 6, x + 2, y + 28 + i * 6);
    context.quadraticCurveTo(x + 14, y + 34 + i * 6, x + 26, y + 28 + i * 6); context.stroke();
  }
  context.fillStyle = '#925330';
  context.beginPath(); context.moveTo(x - 18, y + 3); context.lineTo(x, y - 11);
  context.lineTo(x + 18, y + 3); context.closePath(); context.fill();
  context.fillStyle = '#f1d69a'; context.fillRect(x - 13, y + 4, 26, 18);
  context.fillStyle = '#6b4b34'; context.fillRect(x - 3, y + 12, 6, 10);
}

function drawBranchInset(context: CanvasRenderingContext2D, width: number, height: number) {
  const boxWidth = Math.min(188, width * .39);
  const x = width - boxWidth - 11;
  const y = height - 146;
  context.fillStyle = 'rgba(255,250,233,.96)'; context.strokeStyle = '#b9935d'; context.lineWidth = 1;
  context.beginPath(); context.roundRect(x, y, boxWidth, 134, 8); context.fill(); context.stroke();
  context.fillStyle = '#204b37'; context.font = '800 10px "Nunito Sans", sans-serif';
  context.textAlign = 'left'; context.fillText('ĐƯỜNG NHÁNH TÂN HY', x + 11, y + 17, boxWidth - 20);
  const labels = ['Hải Ninh', 'Phước Thuận – Tiên Đào', 'Vĩnh An', 'Tân Hy'];
  labels.forEach((label, index) => {
    const cy = y + 37 + index * 27;
    if (index < labels.length - 1) {
      context.strokeStyle = '#be8b50'; context.lineWidth = 1.5;
      context.beginPath(); context.moveTo(x + 17, cy + 5); context.lineTo(x + 17, cy + 27); context.stroke();
    }
    context.beginPath(); context.arc(x + 17, cy, 4.5, 0, Math.PI * 2);
    context.fillStyle = index === 3 ? '#a23c2d' : '#426c50'; context.fill();
    context.fillStyle = '#2c4535'; context.font = '700 10px "Nunito Sans", sans-serif';
    context.fillText(label, x + 29, cy + 1, boxWidth - 38);
  });
}

function drawArchiveInset(context: CanvasRenderingContext2D, width: number, height: number) {
  const boxWidth = Math.min(190, width * .4);
  const x = 11;
  const y = height - 166;
  context.fillStyle = 'rgba(255,250,233,.97)'; context.strokeStyle = '#b9935d'; context.lineWidth = 1;
  context.beginPath(); context.roundRect(x, y, boxWidth, 155, 8); context.fill(); context.stroke();
  context.fillStyle = '#204b37'; context.font = '800 10px "Nunito Sans", sans-serif';
  context.textAlign = 'left'; context.fillText('DÒNG CHẢY GIA PHỔ', x + 10, y + 18, boxWidth - 18);
  [['1874', 'Tu diễn từ Tiếu thư'], ['1993', 'Biên soạn Quốc ngữ'], ['2023', 'Tiếp biên gia phả']].forEach(([year, label], index) => {
    const cy = y + 45 + index * 42;
    context.fillStyle = '#a2392b'; context.font = '800 15px "Baloo 2", sans-serif';
    context.fillText(year, x + 11, cy);
    context.fillStyle = '#47604b'; context.font = '700 10px "Nunito Sans", sans-serif';
    context.fillText(label, x + 61, cy - 1, boxWidth - 68);
    if (index < 2) {
      context.strokeStyle = '#d1b377'; context.beginPath(); context.moveTo(x + 28, cy + 7); context.lineTo(x + 28, cy + 32); context.stroke();
    }
  });
}

function drawDispersionInset(context: CanvasRenderingContext2D, width: number, height: number) {
  const boxWidth = Math.min(198, width * .46);
  const x = width - boxWidth - 11;
  const y = height - 148;
  context.fillStyle = 'rgba(255,250,233,.97)'; context.strokeStyle = '#b9935d'; context.lineWidth = 1;
  context.beginPath(); context.roundRect(x, y, boxWidth, 136, 8); context.fill(); context.stroke();
  context.fillStyle = '#204b37'; context.font = '800 10px "Nunito Sans", sans-serif';
  context.textAlign = 'left'; context.fillText('TỪ PHÁI HÀ QUAN', x + 10, y + 17, boxWidth - 20);
  ['Đồng Chổi · Tam Xuân', 'Thạch Kiều · Tam Xuân', 'Thành Mỹ · Tam Thành'].forEach((label, index) => {
    const cy = y + 43 + index * 30;
    context.fillStyle = '#a23c2d'; context.beginPath(); context.arc(x + 17, cy - 3, 4, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#36543e'; context.font = '700 10px "Nunito Sans", sans-serif';
    context.fillText(label, x + 29, cy, boxWidth - 38);
  });
}

function drawCrossReferenceInset(context: CanvasRenderingContext2D, width: number, height: number) {
  const boxWidth = Math.min(192, width * .45);
  const x = width - boxWidth - 11;
  const y = height - 124;
  context.fillStyle = 'rgba(255,250,233,.97)'; context.strokeStyle = '#b9935d'; context.lineWidth = 1;
  context.beginPath(); context.roundRect(x, y, boxWidth, 112, 8); context.fill(); context.stroke();
  context.fillStyle = '#204b37'; context.font = '800 10px "Nunito Sans", sans-serif';
  context.textAlign = 'left'; context.fillText('ĐỐI CHIẾU TIẾU THƯ', x + 10, y + 18, boxWidth - 20);
  context.fillStyle = '#a23c2d'; context.font = '800 27px "Baloo 2", sans-serif';
  context.fillText('235', x + 10, y + 58); context.fillText('32', x + 10, y + 91);
  context.fillStyle = '#36543e'; context.font = '700 10px "Nunito Sans", sans-serif';
  context.fillText('tên được sao lục', x + 72, y + 53, boxWidth - 79);
  context.fillText('tên trùng khi đối chiếu', x + 72, y + 86, boxWidth - 79);
}

function drawDigitalInset(context: CanvasRenderingContext2D, width: number, height: number) {
  const x = Math.max(120, width * .63);
  const y = height * .24;
  const points = [
    { x, y },
    { x: x - 55, y: y + 69 }, { x: x + 55, y: y + 69 },
    { x: x - 79, y: y + 134 }, { x: x - 30, y: y + 134 },
    { x: x + 30, y: y + 134 }, { x: x + 79, y: y + 134 }
  ];
  context.strokeStyle = '#a77743'; context.lineWidth = 2.5;
  for (let index = 1; index < points.length; index++) {
    const parent = points[index < 3 ? 0 : index < 5 ? 1 : 2];
    context.beginPath(); context.moveTo(parent.x, parent.y); context.lineTo(points[index].x, points[index].y); context.stroke();
  }
  points.forEach((point, index) => {
    context.beginPath(); context.arc(point.x, point.y, index === 0 ? 12 : 8, 0, Math.PI * 2);
    context.fillStyle = index === 0 ? '#a23c2d' : '#2f694d'; context.fill();
    context.strokeStyle = '#fff3d3'; context.lineWidth = 2; context.stroke();
  });
  drawBadge(context, Math.max(8, x - 75), y + 160, 'CÂY GIA PHẢ TIẾP NỐI', true);
}

function drawScene(context: CanvasRenderingContext2D, width: number, height: number, project: Projection, scene: number, progress: number) {
  context.clearRect(0, 0, width, height);
  const routes = ROUTES[scene];
  routes.forEach((route, index) => drawRoute(context, route, project, Math.max(0, Math.min(1, progress * routes.length - index))));
  const offsets: Partial<Record<PlaceId, Point>> = {
    haiVan: { x: -25, y: -22 }, langCo: { x: 20, y: -29 },
    banThach: { x: -32, y: 13 }, haQuan: { x: 20, y: 18 },
    nuiRuon: { x: -37, y: -24 }, tanHy: { x: -27, y: 32 }, sonTra: { x: 27, y: 36 }
  };
  MARKERS[scene].forEach((id, index) => {
    const place = PLACES[id];
    drawMarker(context, project(place.lon, place.lat), index, offsets[id]);
  });
  if (scene === 0) {
    const first = project(PLACES.thanhHoa.lon, PLACES.thanhHoa.lat);
    const second = project(PLACES.nhuongBan.lon, PLACES.nhuongBan.lat);
    drawBadge(context, Math.max(8, first.x - 156), first.y - 32, 'Xuân Thọ – Sơn Lam');
    drawBadge(context, Math.max(8, second.x - 130), second.y + 18, 'Nhượng Bạn · Hà Tĩnh', true);
    drawBadge(context, 12, height - 38, 'Hai chặng quê gốc');
  }
  if (scene === 1) {
    drawRooster(context, width, height);
    drawBadge(context, 12, height - 38, 'Lời truyền · 1505–1509');
  }
  if (scene === 2) {
    const storm = project(PLACES.haiVan.lon, PLACES.haiVan.lat);
    drawFleet(context, width, height);
    drawStorm(context, storm);
    drawBadge(context, Math.min(width - 135, storm.x + 28), storm.y - 65, 'BÃO NGOÀI HẢI VÂN', true);
    drawBadge(context, 12, height - 38, '5 thuyền · 2 bị đắm');
  }
  if (scene === 3) {
    const place = project(PLACES.haQuan.lon, PLACES.haQuan.lat);
    drawSettlement(context, place, width);
    context.beginPath(); context.arc(place.x, place.y, 43 + progress * 12, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(173,106,49,.45)'; context.lineWidth = 2; context.stroke();
    drawBadge(context, Math.min(width - 158, place.x + 35), place.y - 50, 'CÁT CẠO → HÀ QUAN', true);
    drawBadge(context, 12, height - 40, 'Mùng 01/12 âm lịch');
  }
  if (scene === 4) {
    drawBadge(context, 12, height - 70, '3 PHÁI TỪ ĐỜI THỨ TƯ', true);
    drawBadge(context, 12, height - 38, 'Thứ phái: chưa rõ nơi');
  }
  if (scene === 5) drawBranchInset(context, width, height);
  if (scene === 6) {
    drawDispersionInset(context, width, height);
    drawBadge(context, 12, height - 38, 'Một số chi thất lạc gia phổ');
  }
  if (scene === 7) {
    drawCrossReferenceInset(context, width, height);
    drawBadge(context, 12, height - 38, 'Mối dây cần kiểm chứng');
  }
  if (scene === 8) drawArchiveInset(context, width, height);
  if (scene === 9) drawDigitalInset(context, width, height);
}

export default function OriginJourneyMap({ activeChapter, onSelectChapter, compact = false, animate = true }: { activeChapter: number; onSelectChapter: (chapter: number) => void; compact?: boolean; animate?: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const landRef = useRef<HTMLCanvasElement>(null);
  const journeyRef = useRef<HTMLCanvasElement>(null);
  const stopsRef = useRef<HTMLDivElement>(null);
  const [previewChapter, setPreviewChapter] = useState(activeChapter);
  const sceneIndex = compact ? activeChapter : previewChapter;
  const scene = SCENES[sceneIndex];

  useEffect(() => setPreviewChapter(activeChapter), [activeChapter]);
  useEffect(() => {
    const strip = stopsRef.current;
    const button = strip?.children[sceneIndex] as HTMLElement | undefined;
    if (!strip || !button) return;
    strip.scrollTo({ left: button.offsetLeft - strip.offsetLeft - (strip.clientWidth - button.clientWidth) / 2, behavior: animate ? 'smooth' : 'instant' });
  }, [sceneIndex, animate]);

  useEffect(() => {
    const frame = frameRef.current;
    const land = landRef.current;
    const journey = journeyRef.current;
    if (!frame || !land || !journey) return;
    const reducedMotion = !animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let animation = 0;
    let width = 0;
    let height = 0;
    let routeContext: CanvasRenderingContext2D | null = null;
    let project: Projection = () => ({ x: 0, y: 0 });

    const render = (now: number) => {
      if (!routeContext) return;
      const progress = reducedMotion ? 1 : Math.min(1, (now - start) / 2200);
      drawScene(routeContext, width, height, project, sceneIndex, progress);
      if (progress < 1) animation = requestAnimationFrame(render);
    };
    const resize = () => {
      width = frame.clientWidth;
      height = frame.clientHeight;
      if (!width || !height) return;
      project = projector(width, height);
      const landContext = setupCanvas(land, width, height);
      routeContext = setupCanvas(journey, width, height);
      if (landContext) drawLand(landContext, width, height, project);
      cancelAnimationFrame(animation);
      animation = requestAnimationFrame(render);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    resize();
    return () => { observer.disconnect(); cancelAnimationFrame(animation); };
  }, [sceneIndex, animate]);

  return (
    <>
      {!compact && <div ref={stopsRef} className={styles.mapStops} role="group" aria-label="Các lớp câu chuyện trên bản đồ">
        {SCENES.map((item, index) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={sceneIndex === index}
            className={`${styles.mapStop} ${sceneIndex === index ? styles.mapStopActive : ''}`}
            onClick={() => setPreviewChapter(index)}
          >
            <span className={styles.mapStopNumber}>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>}
      <div>
        <div ref={frameRef} className={styles.mapCanvasFrame} role="img" aria-label={`Bản đồ đất liền Việt Nam: ${scene.title}. ${scene.summary}`}>
          <canvas ref={landRef} className={styles.mapLandCanvas} aria-hidden="true" />
          <canvas ref={journeyRef} className={styles.mapRouteCanvas} aria-hidden="true" />
          <span className={styles.mapNorth} aria-hidden="true">BẮC <span>✦</span> NAM</span>
          <span className={styles.mapSea} aria-hidden="true">BIỂN ĐÔNG</span>
        </div>
        <div className={styles.mapPlaceLegend} aria-label="Chú giải các điểm đánh số trên bản đồ">
          {MARKERS[sceneIndex].map((place, index) => (
            <span key={place}><b>{index + 1}</b>{PLACE_NAMES[place]}</span>
          ))}
        </div>
        <div className={styles.mapSceneBody} aria-live="polite">
          <span className={styles.mapSceneKicker}>LỚP CHUYỆN {String(sceneIndex + 1).padStart(2, '0')} / {String(SCENES.length).padStart(2, '0')}</span>
          <span className={styles.mapEvidence}>{scene.evidence}</span>
          <h2>{scene.title}</h2>
          {!compact && <p>{scene.summary}</p>}
          {!compact && <ol className={`${styles.mapSceneFacts} ${scene.facts.length === 4 ? styles.mapSceneFactsFour : ''}`}>
            {scene.facts.map(fact => <li key={fact}>{fact}</li>)}
          </ol>}
          <div className={styles.mapSceneFoot}>
            <small>{scene.source}</small>
            {!compact && <button type="button" onClick={() => onSelectChapter(scene.chapter)}>Đọc chương liên quan →</button>}
          </div>
        </div>
      </div>
    </>
  );
}
