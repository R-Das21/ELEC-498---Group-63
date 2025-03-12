import React, { useRef, useEffect } from "react";
import "./App.css"; // 这里放你的CSS

function CustomSpinner() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    const boundaryX = 200;
    const boundaryY = 200;
    const radius = 3;
    const numPoints = 14; // 增加到12个点
    const speedMultiplier = 5; // 提高运动速度

    // 创建随机点
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const p = {
        x: Math.random() * boundaryX,
        y: Math.random() * boundaryY,
        vx: (Math.random() - 0.5) * speedMultiplier,
        vy: (Math.random() - 0.5) * speedMultiplier,
        buddy: null
      };
      points.push(p);
    }
    // 让每个点的 buddy 为下一个点，形成闭合图形
    for (let i = 0; i < points.length; i++) {
      points[i].buddy = points[(i + 1) % points.length];
    }

    // 画圆
    function drawCircle(x, y) {
      context.beginPath();
      context.arc(x, y, radius, 0, 2 * Math.PI);
      context.fillStyle = "#333"; // 如果觉得太淡，可以调整颜色
      context.fill();
    }

    // 画线
    function drawLine(x1, y1, x2, y2) {
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.strokeStyle = "#333"; // 如果觉得太淡，可以调整颜色
      context.stroke();
    }

    // 边缘反弹
    function resetVelocity(point, axis, direction) {
      if (axis === "x") {
        point.vx = Math.abs(point.vx) * direction;
      } else {
        point.vy = Math.abs(point.vy) * direction;
      }
    }

    // 主绘制函数
    function draw() {
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        point.x += point.vx;
        point.y += point.vy;

        // 画圆和连线
        drawCircle(point.x, point.y);
        drawLine(point.x, point.y, point.buddy.x, point.buddy.y);

        // 边缘检测
        if (point.x < radius) {
          resetVelocity(point, "x", 1);
        } else if (point.x > boundaryX - radius) {
          resetVelocity(point, "x", -1);
        }
        if (point.y < radius) {
          resetVelocity(point, "y", 1);
        } else if (point.y > boundaryY - radius) {
          resetVelocity(point, "y", -1);
        }
      }
    }

    // 动画循环
    function animate() {
      context.clearRect(0, 0, boundaryX, boundaryY);
      draw();
      requestAnimationFrame(animate);
    }

    animate();
  }, []);

  return (
    <div id="loading-container">
      {/* 这里宽高 200 与 boundaryX、boundaryY 对应 */}
      <canvas ref={canvasRef} width={200} height={200} />
    </div>
  );
}

export default CustomSpinner;
