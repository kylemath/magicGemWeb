/**
 * Magic Gems 3D Fabrication, STL & Papercraft Studio — studio.js
 * Companion to Paper C ("Balance in Inequality: Testing the Physical Equilibrium,
 * Precession, and Structural Stability of Magic Gems")
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. EXACT INTEGER ARITHMETIC & RATIONAL HELPERS
  // =========================================================================

  function gcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b > 0) {
      var t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }

  function gcd3(a, b, c) {
    return gcd(gcd(a, b), c);
  }

  function gcd4(a, b, c, d) {
    return gcd(gcd(a, b), gcd(c, d));
  }

  function fmtRational(num, den) {
    if (den === 0 || num === 0) return '0';
    if (den < 0) {
      num = -num;
      den = -den;
    }
    var g = gcd(num, den);
    num = Math.round(num / g);
    den = Math.round(den / g);
    return den === 1 ? String(num) : num + '/' + den;
  }

  // Invert square via S* = r^2(17 - S) so G_lambda(S*) = -G_lambda(S)
  function invertSquareTwin(sq16) {
    var out = new Array(16);
    for (var i = 0; i < 16; i++) {
      out[i] = 17 - sq16[15 - i];
    }
    return out;
  }

  // 2D Andrew's Monotone Chain for coplanar point ordering
  function convexHull2D(pts2d) {
    var n = pts2d.length;
    if (n <= 2) return pts2d.map(function (p) { return p.idx; });
    var sorted = pts2d.slice().sort(function (a, b) {
      return (a.u - b.u) || (a.v - b.v);
    });
    function cross2(o, a, b) {
      return (a.u - o.u) * (b.v - o.v) - (a.v - o.v) * (b.u - o.u);
    }
    var lower = [];
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      while (lower.length >= 2 && cross2(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-9) {
        lower.pop();
      }
      lower.push(p);
    }
    var upper = [];
    for (var j = sorted.length - 1; j >= 0; j--) {
      var q = sorted[j];
      while (upper.length >= 2 && cross2(upper[upper.length - 2], upper[upper.length - 1], q) <= 1e-9) {
        upper.pop();
      }
      upper.push(q);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper).map(function (p) { return p.idx; });
  }

  // =========================================================================
  // 2. EXACT INTEGER 3D CONVEX HULL & POLYHEDRAL MECHANICS ENGINE
  // =========================================================================

  /**
   * Computes the exact 3D convex hull of a set of integer-doubled points
   * pts2 = [[x2, y2, z2, id], ...] where x2 = 2x, y2 = 2y, z2 = 2z are integers.
   * Returns rank (0, 1, 2, 3), f-vector, faces, edges, exact volume6, and exact moments.
   */
  function computeExactHull3D(pts2) {
    var n = pts2.length;
    if (n === 0) {
      return { rank: 0, vIds: [], faces: [], edges: [], fVec: [0, 0, 0], vol6: 0, c0: [0, 0, 0], c0Str: ['0', '0', '0'] };
    }
    if (n === 1) {
      return { rank: 0, vIds: [pts2[0][3]], faces: [], edges: [], fVec: [1, 0, 0], vol6: 0, c0: [pts2[0][0] / 2, pts2[0][1] / 2, pts2[0][2] / 2], c0Str: ['0', '0', '0'] };
    }

    // Check collinearity / coplanarity
    var p0 = pts2[0];
    var v1 = null;
    for (var i = 1; i < n; i++) {
      var dx = pts2[i][0] - p0[0], dy = pts2[i][1] - p0[1], dz = pts2[i][2] - p0[2];
      if (dx !== 0 || dy !== 0 || dz !== 0) {
        v1 = [dx, dy, dz];
        break;
      }
    }
    if (!v1) {
      return { rank: 0, vIds: [p0[3]], faces: [], edges: [], fVec: [1, 0, 0], vol6: 0, c0: [0, 0, 0], c0Str: ['0', '0', '0'] };
    }

    var normalRef = null;
    for (var j = 1; j < n; j++) {
      var ux = pts2[j][0] - p0[0], uy = pts2[j][1] - p0[1], uz = pts2[j][2] - p0[2];
      var cx = v1[1] * uz - v1[2] * uy;
      var cy = v1[2] * ux - v1[0] * uz;
      var cz = v1[0] * uy - v1[1] * ux;
      if (cx !== 0 || cy !== 0 || cz !== 0) {
        normalRef = [cx, cy, cz];
        break;
      }
    }
    if (!normalRef) {
      // Rank 1 (collinear segment)
      var minProj = Infinity, maxProj = -Infinity, idMin = p0[3], idMax = p0[3];
      for (var k = 0; k < n; k++) {
        var pr = (pts2[k][0] - p0[0]) * v1[0] + (pts2[k][1] - p0[1]) * v1[1] + (pts2[k][2] - p0[2]) * v1[2];
        if (pr < minProj) { minProj = pr; idMin = pts2[k][3]; }
        if (pr > maxProj) { maxProj = pr; idMax = pts2[k][3]; }
      }
      return {
        rank: 1,
        vIds: idMin === idMax ? [idMin] : [idMin, idMax],
        faces: [],
        edges: idMin === idMax ? [] : [[Math.min(idMin, idMax), Math.max(idMin, idMax)]],
        fVec: [idMin === idMax ? 1 : 2, idMin === idMax ? 0 : 1, 0],
        vol6: 0,
        c0: [0, 0, 0],
        c0Str: ['0', '0', '0']
      };
    }

    var is3D = false;
    for (var m = 1; m < n; m++) {
      var wx = pts2[m][0] - p0[0], wy = pts2[m][1] - p0[1], wz = pts2[m][2] - p0[2];
      if (normalRef[0] * wx + normalRef[1] * wy + normalRef[2] * wz !== 0) {
        is3D = true;
        break;
      }
    }

    if (!is3D) {
      // Rank 2 (coplanar polygon)
      var nLen = Math.hypot(normalRef[0], normalRef[1], normalRef[2]);
      var nx = normalRef[0] / nLen, ny = normalRef[1] / nLen, nz = normalRef[2] / nLen;
      var ref = Math.abs(nx) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      var e1x = ny * ref[2] - nz * ref[1], e1y = nz * ref[0] - nx * ref[2], e1z = nx * ref[1] - ny * ref[0];
      var e1L = Math.hypot(e1x, e1y, e1z);
      e1x /= e1L; e1y /= e1L; e1z /= e1L;
      var e2x = ny * e1z - nz * e1y, e2y = nz * e1x - nx * e1z, e2z = nx * e1y - ny * e1x;
      var proj2d = pts2.map(function (pt, idx) {
        return {
          u: pt[0] * e1x + pt[1] * e1y + pt[2] * e1z,
          v: pt[0] * e2x + pt[1] * e2y + pt[2] * e2z,
          idx: idx
        };
      });
      var hullLocal = convexHull2D(proj2d);
      var vIds2 = hullLocal.map(function (li) { return pts2[li][3]; });
      var edges2 = [];
      for (var e = 0; e < hullLocal.length; e++) {
        var aId = pts2[hullLocal[e]][3];
        var bId = pts2[hullLocal[(e + 1) % hullLocal.length]][3];
        edges2.push([Math.min(aId, bId), Math.max(aId, bId)]);
      }
      return {
        rank: 2,
        vIds: vIds2,
        faces: [{ localVerts: hullLocal, globalVerts: vIds2, normal: [nx, ny, nz] }],
        edges: edges2,
        fVec: [vIds2.length, edges2.length, 1],
        vol6: 0,
        c0: [0, 0, 0],
        c0Str: ['0', '0', '0']
      };
    }

    // Rank 3: Full 3D Convex Polyhedron
    var planeMap = Object.create(null);
    var faces = [];

    for (var i1 = 0; i1 < n - 2; i1++) {
      var A = pts2[i1];
      for (var i2 = i1 + 1; i2 < n - 1; i2++) {
        var B = pts2[i2];
        var abx = B[0] - A[0], aby = B[1] - A[1], abz = B[2] - A[2];
        for (var i3 = i2 + 1; i3 < n; i3++) {
          var C = pts2[i3];
          var acx = C[0] - A[0], acy = C[1] - A[1], acz = C[2] - A[2];
          var na = aby * acz - abz * acy;
          var nb = abz * acx - abx * acz;
          var nc = abx * acy - aby * acx;
          if (na === 0 && nb === 0 && nc === 0) continue;

          var d = na * A[0] + nb * A[1] + nc * A[2];
          var hasPos = false, hasNeg = false;
          for (var p = 0; p < n; p++) {
            var s = na * pts2[p][0] + nb * pts2[p][1] + nc * pts2[p][2] - d;
            if (s > 0) { hasPos = true; if (hasNeg) break; }
            else if (s < 0) { hasNeg = true; if (hasPos) break; }
          }
          if (hasPos && hasNeg) continue;

          // Orient normal strictly outward (so all points satisfy n . x <= d)
          if (hasPos) {
            na = -na; nb = -nb; nc = -nc; d = -d;
          }
          var g = gcd4(na, nb, nc, d);
          na = Math.round(na / g);
          nb = Math.round(nb / g);
          nc = Math.round(nc / g);
          d  = Math.round(d / g);

          var key = na + ',' + nb + ',' + nc + ',' + d;
          if (planeMap[key]) continue;
          planeMap[key] = true;

          // Collect all coplanar points on this facet
          var coplanarIdx = [];
          for (var q = 0; q < n; q++) {
            if (na * pts2[q][0] + nb * pts2[q][1] + nc * pts2[q][2] === d) {
              coplanarIdx.push(q);
            }
          }

          var nL = Math.hypot(na, nb, nc);
          var unx = na / nL, uny = nb / nL, unz = nc / nL;
          var rVec = Math.abs(unx) < 0.9 ? [1, 0, 0] : [0, 1, 0];
          var u1x = uny * rVec[2] - unz * rVec[1];
          var u1y = unz * rVec[0] - unx * rVec[2];
          var u1z = unx * rVec[1] - uny * rVec[0];
          var u1L = Math.hypot(u1x, u1y, u1z);
          u1x /= u1L; u1y /= u1L; u1z /= u1L;
          var u2x = uny * u1z - unz * u1y;
          var u2y = unz * u1x - unx * u1z;
          var u2z = unx * u1y - uny * u1x;

          var pts2d = coplanarIdx.map(function (ci) {
            var pt = pts2[ci];
            return {
              u: pt[0] * u1x + pt[1] * u1y + pt[2] * u1z,
              v: pt[0] * u2x + pt[1] * u2y + pt[2] * u2z,
              idx: ci
            };
          });

          var cycLocal = convexHull2D(pts2d);
          var cycGlobal = cycLocal.map(function (li) { return pts2[li][3]; });
          faces.push({
            localVerts: cycLocal,
            globalVerts: cycGlobal,
            intNormal: [na, nb, nc, d],
            normal: [unx, uny, unz]
          });
        }
      }
    }

    // Collect extreme vertices and edges
    var vertSet = Object.create(null);
    var edgeMap = Object.create(null);
    var edges = [];

    for (var f = 0; f < faces.length; f++) {
      var gv = faces[f].globalVerts;
      var lv = faces[f].localVerts;
      var mLen = gv.length;
      for (var sIdx = 0; sIdx < mLen; sIdx++) {
        vertSet[gv[sIdx]] = true;
        var uG = gv[sIdx], vG = gv[(sIdx + 1) % mLen];
        var eKey = uG < vG ? (uG + '_' + vG) : (vG + '_' + uG);
        if (!edgeMap[eKey]) {
          edgeMap[eKey] = true;
          edges.push({
            uGlobal: Math.min(uG, vG),
            vGlobal: Math.max(uG, vG),
            uLocal: lv[sIdx],
            vLocal: lv[(sIdx + 1) % mLen]
          });
        }
      }
    }

    var vIds = Object.keys(vertSet).map(Number).sort(function (a, b) { return a - b; });

    // Compute exact volume & first moments via fan triangulation from interior centroid
    var cx2 = 0, cy2 = 0, cz2 = 0;
    for (var vi = 0; vi < n; vi++) {
      cx2 += pts2[vi][0];
      cy2 += pts2[vi][1];
      cz2 += pts2[vi][2];
    }
    cx2 /= n; cy2 /= n; cz2 /= n;

    // Because pts2 are doubled coordinates (2x, 2y, 2z):
    // det(p0_2, p1_2, p2_2) = 8 * det(p0, p1, p2) = 48 * V_tet
    var det2Sum = 0;
    var momXSum = 0, momYSum = 0, momZSum = 0;

    for (var fi = 0; fi < faces.length; fi++) {
      var flv = faces[fi].localVerts;
      var P0 = pts2[flv[0]];
      for (var ti = 1; ti < flv.length - 1; ti++) {
        var P1 = pts2[flv[ti]];
        var P2 = pts2[flv[ti + 1]];
        var det2 = P0[0] * (P1[1] * P2[2] - P1[2] * P2[1])
                 - P0[1] * (P1[0] * P2[2] - P1[2] * P2[0])
                 + P0[2] * (P1[0] * P2[1] - P1[1] * P2[0]);
        det2Sum += det2;
        momXSum += det2 * (P0[0] + P1[0] + P2[0]);
        momYSum += det2 * (P0[1] + P1[1] + P2[1]);
        momZSum += det2 * (P0[2] + P1[2] + P2[2]);
      }
    }

    // Real volume = det2Sum / 48; vol6 = 6 * Vol = det2Sum / 8
    var vol48 = Math.round(det2Sum);
    var volStr = fmtRational(vol48, 48);
    var c0 = [0, 0, 0];
    var c0Str = ['0', '0', '0'];
    if (vol48 > 0) {
      // Centroid of tetrahedron in real coords is (P0_2 + P1_2 + P2_2) / 8
      c0 = [
        momXSum / (8 * det2Sum),
        momYSum / (8 * det2Sum),
        momZSum / (8 * det2Sum)
      ];
      c0Str = [
        fmtRational(Math.round(momXSum), 8 * vol48),
        fmtRational(Math.round(momYSum), 8 * vol48),
        fmtRational(Math.round(momZSum), 8 * vol48)
      ];
    }

    return {
      rank: 3,
      vIds: vIds,
      faces: faces,
      edges: edges,
      fVec: [vIds.length, edges.length, faces.length],
      vol48: vol48,
      volReal: vol48 / 48,
      volStr: volStr,
      c0: c0,
      c0Str: c0Str
    };
  }

  /**
   * Full mechanical analysis of an order-4 magic square at vertical lift lambda.
   */
  function analyzeSquareMechanics(sqNum, isTwin, lambda) {
    var rawSq = (window.ALL880_SQUARES && window.ALL880_SQUARES[sqNum - 1])
      ? window.ALL880_SQUARES[sqNum - 1]
      : [16, 3, 2, 13, 5, 10, 11, 8, 9, 6, 7, 12, 4, 15, 14, 1];
    var sq = isTwin ? invertSquareTwin(rawSq) : rawSq.slice();

    // Build 16 doubled-coordinate points: x2 in {-3,-1,1,3}, y2 in {3,1,-1,-3}, z2 = 2*s - 17
    var pts2 = [];
    var ptsLambda = [];
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        var idx = 4 * r + c;
        var sVal = sq[idx];
        var x2 = 2 * c - 3;
        var y2 = 3 - 2 * r;
        var z2 = 2 * sVal - 17;
        pts2.push([x2, y2, z2, idx]);
        ptsLambda.push([x2 / 2, y2 / 2, lambda * (sVal - 8.5), sVal, idx]);
      }
    }

    // Outer Hull G_0(S)
    var outer = computeExactHull3D(pts2);

    // 3-way point classification: V_0 (corner), V_face (coplanar non-corner), V_int (strictly interior)
    var v0Map = Object.create(null);
    for (var i = 0; i < outer.vIds.length; i++) v0Map[outer.vIds[i]] = true;

    var pointRole = new Array(16); // 'outer', 'face', 'int'
    var nonExtremePts2 = [];
    var cntV0 = outer.vIds.length, cntVface = 0, cntVint = 0;

    for (var p = 0; p < 16; p++) {
      if (v0Map[p]) {
        pointRole[p] = 'outer';
      } else {
        nonExtremePts2.push(pts2[p]);
        var onBoundary = false;
        for (var fi = 0; fi < outer.faces.length; fi++) {
          var pl = outer.faces[fi].intNormal;
          if (pl[0] * pts2[p][0] + pl[1] * pts2[p][1] + pl[2] * pts2[p][2] === pl[3]) {
            onBoundary = true;
            break;
          }
        }
        if (onBoundary) {
          pointRole[p] = 'face';
          cntVface++;
        } else {
          pointRole[p] = 'int';
          cntVint++;
        }
      }
    }

    // Inner Core G_1(S) = conv(V \ V_0)
    var inner = computeExactHull3D(nonExtremePts2);

    // Two-density ratio (Theorem 4.3): Delta_rho_1 / rho_0 = -vol(G_0)*c_0z / (vol(G_1)*c_1z)
    var rhoRatioVal = null;
    var rhoRatioStr = 'N/A';
    if (outer.c0[2] === 0) {
      rhoRatioVal = 0;
      rhoRatioStr = '0 (Naturally balanced)';
    } else if (inner.rank === 3 && inner.vol48 > 0 && inner.c0[2] !== 0) {
      rhoRatioVal = -(outer.volReal * outer.c0[2]) / (inner.volReal * inner.c0[2]);
      rhoRatioStr = rhoRatioVal.toFixed(4);
    } else {
      rhoRatioStr = 'Degenerate core (rk ' + inner.rank + ')';
    }

    // Wireframe 1-skeleton edge moments at current lambda (Theorem 4.4)
    var M0z = 0, L0 = 0;
    for (var ei = 0; ei < outer.edges.length; ei++) {
      var e = outer.edges[ei];
      var pA = ptsLambda[e.uGlobal], pB = ptsLambda[e.vGlobal];
      var len = Math.hypot(pA[0] - pB[0], pA[1] - pB[1], pA[2] - pB[2]);
      var midZ = 0.5 * (pA[2] + pB[2]);
      L0 += len;
      M0z += len * midZ;
    }

    var M1z = 0, L1 = 0;
    if (inner.edges && inner.edges.length > 0) {
      for (var ie = 0; ie < inner.edges.length; ie++) {
        var edgeIn = inner.edges[ie];
        var uG = Array.isArray(edgeIn) ? edgeIn[0] : edgeIn.uGlobal;
        var vG = Array.isArray(edgeIn) ? edgeIn[1] : edgeIn.vGlobal;
        var qA = ptsLambda[uG], qB = ptsLambda[vG];
        var lenIn = Math.hypot(qA[0] - qB[0], qA[1] - qB[1], qA[2] - qB[2]);
        var midZIn = 0.5 * (qA[2] + qB[2]);
        L1 += lenIn;
        M1z += lenIn * midZIn;
      }
    }

    var wireRatio = null;
    var wireRatioNote = '';
    if (Math.abs(M0z) < 1e-9) {
      wireRatio = 0;
      wireRatioNote = 'M₀,z = 0 (Outer wireframe self-balances: d₁ = 0)';
    } else if (M0z * M1z < -1e-9) {
      wireRatio = Math.sqrt(-M0z / M1z);
      wireRatioNote = 'd₁/d₀ = ' + wireRatio.toFixed(3) + ' (Opposing moments)';
    } else {
      wireRatio = null;
      wireRatioNote = 'Same-sign wireframe moments (Use K₁₆ equal-mass struts)';
    }

    // Quadrupole Q_xy and Point-Cloud Inertia Ratio I_perp / I_zz(lambda)
    var Qxy = 0;
    for (var qi = 0; qi < 16; qi++) {
      Qxy += ptsLambda[qi][0] * ptsLambda[qi][1] * ptsLambda[qi][3];
    }
    var Izz = 40;
    var Iperp = 20 + 340 * lambda * lambda;
    var inertiaRatio = Iperp / Izz;

    // Proposition 5.2: Resting Facet Stability at current lambda
    var stableCount = 0;
    var maxTipDeg = 0;
    var comVec = [outer.c0[0], outer.c0[1], lambda * outer.c0[2]];
    var facetStability = [];

    for (var fIdx = 0; fIdx < outer.faces.length; fIdx++) {
      var face = outer.faces[fIdx];
      var flv = face.localVerts;
      var A3 = ptsLambda[flv[0]], B3 = ptsLambda[flv[1]], C3 = ptsLambda[flv[2]];
      var ux = B3[0] - A3[0], uy = B3[1] - A3[1], uz = B3[2] - A3[2];
      var vx = C3[0] - A3[0], vy = C3[1] - A3[1], vz = C3[2] - A3[2];
      var nx = uy * vz - uz * vy;
      var ny = uz * vx - ux * vz;
      var nz = ux * vy - uy * vx;
      var nNorm = Math.hypot(nx, ny, nz) || 1;
      nx /= nNorm; ny /= nNorm; nz /= nNorm;
      // Ensure outward orientation
      if (nx * (A3[0] - comVec[0]) + ny * (A3[1] - comVec[1]) + nz * (A3[2] - comVec[2]) < 0) {
        nx = -nx; ny = -ny; nz = -nz;
      }

      // Project CoM onto facet plane
      var hDist = (A3[0] - comVec[0]) * nx + (A3[1] - comVec[1]) * ny + (A3[2] - comVec[2]) * nz;
      var projX = comVec[0] + hDist * nx;
      var projY = comVec[1] + hDist * ny;
      var projZ = comVec[2] + hDist * nz;

      var isStable = true;
      var minEdgeAngle = Infinity;
      var mVerts = flv.length;
      for (var ei2 = 0; ei2 < mVerts; ei2++) {
        var V1 = ptsLambda[flv[ei2]];
        var V2 = ptsLambda[flv[(ei2 + 1) % mVerts]];
        var ex = V2[0] - V1[0], ey = V2[1] - V1[1], ez = V2[2] - V1[2];
        var eLen = Math.hypot(ex, ey, ez) || 1;
        ex /= eLen; ey /= eLen; ez /= eLen;
        // Inward edge normal in facet plane: n x e
        var inx = ny * ez - nz * ey;
        var iny = nz * ex - nx * ez;
        var inz = nx * ey - ny * ex;
        var margin = (projX - V1[0]) * inx + (projY - V1[1]) * iny + (projZ - V1[2]) * inz;
        if (margin <= 1e-7) {
          isStable = false;
        }
        var tipDeg = Math.atan2(margin, Math.max(hDist, 1e-9)) * (180 / Math.PI);
        if (tipDeg < minEdgeAngle) minEdgeAngle = tipDeg;
      }
      if (isStable) {
        stableCount++;
        if (minEdgeAngle > maxTipDeg) maxTipDeg = minEdgeAngle;
      }
      facetStability.push({ isStable: isStable, tipAngleDeg: Math.max(0, minEdgeAngle) });
    }

    var summaryRow = (window.ALL880_SUMMARY && window.ALL880_SUMMARY[sqNum - 1]) || null;
    var groupCode = summaryRow ? summaryRow[1] : 'VI';

    return {
      sqNum: sqNum,
      isTwin: isTwin,
      lambda: lambda,
      sq: sq,
      groupCode: groupCode,
      pts2: pts2,
      ptsLambda: ptsLambda,
      outer: outer,
      inner: inner,
      pointRole: pointRole,
      counts: { v0: cntV0, vface: cntVface, vint: cntVint },
      rhoRatioVal: rhoRatioVal,
      rhoRatioStr: rhoRatioStr,
      wireStats: { M0z: M0z, M1z: M1z, L0: L0, L1: L1, ratio: wireRatio, note: wireRatioNote },
      Qxy: Qxy,
      inertiaRatio: inertiaRatio,
      stability: {
        stableCount: stableCount,
        totalFaces: outer.faces.length,
        maxTipDeg: maxTipDeg,
        facets: facetStability
      }
    };
  }

  // =========================================================================
  // 3. PROPOSITION 4.5: 2D PAPERCRAFT UNFOLDING NET & SVG EXPORTER
  // =========================================================================

  /**
   * Builds a connected 2D unfolding net of the outer hull G_lambda(S) via
   * Breadth-First Search (BFS) over the dual graph of facets, starting from
   * the largest-area facet F_0.
   */
  function buildPapercraftNet(mech) {
    var faces = mech.outer.faces;
    var pts3 = mech.ptsLambda;
    var nFaces = faces.length;
    if (nFaces === 0) return null;

    // Compute 3D area and local 2D coordinates of each face
    var faceData = faces.map(function (f, fIdx) {
      var lv = f.localVerts;
      var P0 = pts3[lv[0]];
      // Outward unit normal in scaled coordinates
      var P1 = pts3[lv[1]], P2 = pts3[lv[2]];
      var ux = P1[0] - P0[0], uy = P1[1] - P0[1], uz = P1[2] - P0[2];
      var vx = P2[0] - P0[0], vy = P2[1] - P0[1], vz = P2[2] - P0[2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      var nL = Math.hypot(nx, ny, nz) || 1;
      nx /= nL; ny /= nL; nz /= nL;
      // Ensure outward normal
      if (nx * P0[0] + ny * P0[1] + nz * P0[2] < 0) {
        nx = -nx; ny = -ny; nz = -nz;
      }
      var area = 0;
      for (var k = 1; k < lv.length - 1; k++) {
        var A = pts3[lv[k]], B = pts3[lv[k + 1]];
        var ax = A[0] - P0[0], ay = A[1] - P0[1], az = A[2] - P0[2];
        var bx = B[0] - P0[0], by = B[1] - P0[1], bz = B[2] - P0[2];
        area += 0.5 * Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
      }
      return {
        fIdx: fIdx,
        lv: lv,
        gv: f.globalVerts,
        normal: [nx, ny, nz],
        area: area
      };
    });

    // Pick largest-area facet as root F_0
    var rootIdx = 0;
    for (var i = 1; i < nFaces; i++) {
      if (faceData[i].area > faceData[rootIdx].area) rootIdx = i;
    }

    // Build edge -> adjacent faces lookup
    var edgeAdj = Object.create(null);
    for (var fi = 0; fi < nFaces; fi++) {
      var lv = faceData[fi].lv;
      var m = lv.length;
      for (var s = 0; s < m; s++) {
        var u = lv[s], v = lv[(s + 1) % m];
        var key = u < v ? (u + '_' + v) : (v + '_' + u);
        if (!edgeAdj[key]) edgeAdj[key] = [];
        edgeAdj[key].push({ fIdx: fi, edgeIdx: s, u: u, v: v });
      }
    }

    // Place root face in 2D
    var placed = new Array(nFaces).fill(false);
    var poly2D = new Array(nFaces);
    var treeEdges = Object.create(null);

    // Root basis
    var rFace = faceData[rootIdx];
    var rA = pts3[rFace.lv[0]], rB = pts3[rFace.lv[1]];
    var e1x = rB[0] - rA[0], e1y = rB[1] - rA[1], e1z = rB[2] - rA[2];
    var e1L = Math.hypot(e1x, e1y, e1z) || 1;
    e1x /= e1L; e1y /= e1L; e1z /= e1L;
    var rnx = rFace.normal[0], rny = rFace.normal[1], rnz = rFace.normal[2];
    var e2x = rny * e1z - rnz * e1y;
    var e2y = rnz * e1x - rnx * e1z;
    var e2z = rnx * e1y - rny * e1x;

    poly2D[rootIdx] = rFace.lv.map(function (vIdx) {
      var P = pts3[vIdx];
      var dx = P[0] - rA[0], dy = P[1] - rA[1], dz = P[2] - rA[2];
      return {
        x: dx * e1x + dy * e1y + dz * e1z,
        y: dx * e2x + dy * e2y + dz * e2z,
        vIdx: vIdx,
        sVal: P[3]
      };
    });
    placed[rootIdx] = true;

    // BFS queue over dual graph
    var queue = [rootIdx];
    while (queue.length > 0) {
      var curF = queue.shift();
      var curLv = faceData[curF].lv;
      var cur2D = poly2D[curF];
      var mCur = curLv.length;

      // Signed area of cur2D to know outward edge normal in 2D
      var sArea = 0;
      for (var si = 0; si < mCur; si++) {
        var p1 = cur2D[si], p2 = cur2D[(si + 1) % mCur];
        sArea += p1.x * p2.y - p2.x * p1.y;
      }
      var orientSign = sArea >= 0 ? 1 : -1;

      for (var ei = 0; ei < mCur; ei++) {
        var u = curLv[ei], v = curLv[(ei + 1) % mCur];
        var eKey = u < v ? (u + '_' + v) : (v + '_' + u);
        var adjList = edgeAdj[eKey] || [];
        for (var ai = 0; ai < adjList.length; ai++) {
          var nb = adjList[ai];
          if (nb.fIdx === curF || placed[nb.fIdx]) continue;

          // Unfold neighbor nb.fIdx across shared edge (u, v)
          var U2 = cur2D[ei], V2 = cur2D[(ei + 1) % mCur];
          var U3 = pts3[u], V3 = pts3[v];
          var edgeDx2 = V2.x - U2.x, edgeDy2 = V2.y - U2.y;
          var edgeLen = Math.hypot(edgeDx2, edgeDy2) || 1;
          var tx2 = edgeDx2 / edgeLen, ty2 = edgeDy2 / edgeLen;
          // Outward perpendicular from cur2D across edge (U2 -> V2)
          var outX2 = orientSign * ty2, outY2 = -orientSign * tx2;

          // 3D unit vector along U3 -> V3 and perpendicular inside neighbor face
          var tx3 = (V3[0] - U3[0]) / edgeLen;
          var ty3 = (V3[1] - U3[1]) / edgeLen;
          var tz3 = (V3[2] - U3[2]) / edgeLen;
          var nbN = faceData[nb.fIdx].normal;
          // Vector inside neighbor face perpendicular to U3->V3
          var inX3 = nbN[1] * tz3 - nbN[2] * ty3;
          var inY3 = nbN[2] * tx3 - nbN[0] * tz3;
          var inZ3 = nbN[0] * ty3 - nbN[1] * tx3;
          // Check third vertex of neighbor to ensure in3 points into the neighbor interior
          var nbLv = faceData[nb.fIdx].lv;
          var wIdx = nbLv[0];
          for (var wi = 0; wi < nbLv.length; wi++) {
            if (nbLv[wi] !== u && nbLv[wi] !== v) { wIdx = nbLv[wi]; break; }
          }
          var W3 = pts3[wIdx];
          if ((W3[0] - U3[0]) * inX3 + (W3[1] - U3[1]) * inY3 + (W3[2] - U3[2]) * inZ3 < 0) {
            inX3 = -inX3; inY3 = -inY3; inZ3 = -inZ3;
          }

          poly2D[nb.fIdx] = nbLv.map(function (vertIdx) {
            var P3 = pts3[vertIdx];
            var rx = P3[0] - U3[0], ry = P3[1] - U3[1], rz = P3[2] - U3[2];
            var coordAlong = rx * tx3 + ry * ty3 + rz * tz3;
            var coordPerp  = rx * inX3 + ry * inY3 + rz * inZ3;
            return {
              x: U2.x + coordAlong * tx2 + coordPerp * outX2,
              y: U2.y + coordAlong * ty2 + coordPerp * outY2,
              vIdx: vertIdx,
              sVal: P3[3]
            };
          });

          placed[nb.fIdx] = true;
          treeEdges[eKey] = true;
          queue.push(nb.fIdx);
        }
      }
    }

    // Collect fold edges (in spanning tree) and cut edges + glue tabs (not in tree)
    var cutPairMap = Object.create(null);
    var tabCounter = 0;
    var faceEdges2D = new Array(nFaces);

    for (var f2 = 0; f2 < nFaces; f2++) {
      var poly = poly2D[f2];
      if (!poly) continue;
      var m2 = poly.length;
      var area2 = 0;
      for (var k2 = 0; k2 < m2; k2++) {
        var a2 = poly[k2], b2 = poly[(k2 + 1) % m2];
        area2 += a2.x * b2.y - b2.x * a2.y;
      }
      var sign2 = area2 >= 0 ? 1 : -1;
      faceEdges2D[f2] = [];

      for (var e2 = 0; e2 < m2; e2++) {
        var pA = poly[e2], pB = poly[(e2 + 1) % m2];
        var uId = pA.vIdx, vId = pB.vIdx;
        var key2 = uId < vId ? (uId + '_' + vId) : (vId + '_' + uId);
        var isFold = !!treeEdges[key2];
        var hasTab = false;
        var tabLabel = '';

        if (!isFold) {
          if (cutPairMap[key2] === undefined) {
            tabLabel = String.fromCharCode(97 + (tabCounter % 26));
            tabCounter++;
            cutPairMap[key2] = tabLabel;
            hasTab = true;
          } else {
            tabLabel = cutPairMap[key2];
            hasTab = false;
          }
        }

        // Compute outward trapezoid tab polygon if hasTab
        var tabPoly = null;
        if (hasTab) {
          var dx = pB.x - pA.x, dy = pB.y - pA.y;
          var len = Math.hypot(dx, dy) || 1;
          var tx = dx / len, ty = dy / len;
          var nx = sign2 * ty, ny = -sign2 * tx;
          var tabH = Math.min(0.24, len * 0.22);
          var inset = Math.min(len * 0.22, tabH * 0.95);
          tabPoly = [
            { x: pA.x, y: pA.y },
            { x: pA.x + tx * inset + nx * tabH, y: pA.y + ty * inset + ny * tabH },
            { x: pB.x - tx * inset + nx * tabH, y: pB.y - ty * inset + ny * tabH },
            { x: pB.x, y: pB.y }
          ];
        }

        faceEdges2D[f2].push({
          pA: pA,
          pB: pB,
          isFold: isFold,
          hasTab: hasTab,
          tabLabel: tabLabel,
          tabPoly: tabPoly
        });
      }
    }

    // Compute 2D bounding box
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var f3 = 0; f3 < nFaces; f3++) {
      var poly3 = poly2D[f3];
      if (!poly3) continue;
      for (var pi = 0; pi < poly3.length; pi++) {
        if (poly3[pi].x < minX) minX = poly3[pi].x;
        if (poly3[pi].x > maxX) maxX = poly3[pi].x;
        if (poly3[pi].y < minY) minY = poly3[pi].y;
        if (poly3[pi].y > maxY) maxY = poly3[pi].y;
      }
      var feList = faceEdges2D[f3] || [];
      for (var te = 0; te < feList.length; te++) {
        if (feList[te].tabPoly) {
          for (var tpi = 0; tpi < 4; tpi++) {
            var tp = feList[te].tabPoly[tpi];
            if (tp.x < minX) minX = tp.x;
            if (tp.x > maxX) maxX = tp.x;
            if (tp.y < minY) minY = tp.y;
            if (tp.y > maxY) maxY = tp.y;
          }
        }
      }
    }

    return {
      rootIdx: rootIdx,
      nFaces: nFaces,
      nFolds: nFaces - 1,
      nTabs: tabCounter,
      poly2D: poly2D,
      faceEdges2D: faceEdges2D,
      bounds: { minX: minX, maxX: maxX, minY: minY, maxY: maxY }
    };
  }

  /**
   * Renders the interactive 2D papercraft net onto #gen-net-canvas
   */
  function renderPapercraftCanvas(canvas, net, mech, hoveredFaceIdx) {
    if (!canvas || !net) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Subtle paper grid background
    ctx.fillStyle = '#fcfbf7';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#efeae0';
    ctx.lineWidth = 1;
    for (var gx = 0; gx < W; gx += 24) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (var gy = 0; gy < H; gy += 24) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    var b = net.bounds;
    var spanX = Math.max(0.1, b.maxX - b.minX);
    var spanY = Math.max(0.1, b.maxY - b.minY);
    var pad = 42;
    var scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad - 26) / spanY);
    var cx = 0.5 * (b.minX + b.maxX);
    var cy = 0.5 * (b.minY + b.maxY);

    function toScreen(pt) {
      return {
        x: W * 0.5 + (pt.x - cx) * scale,
        y: (H + 18) * 0.5 - (pt.y - cy) * scale
      };
    }

    // Store screen polygons for hover detection
    net._screenPolys = [];

    // 1. Draw glue tabs first
    for (var f = 0; f < net.nFaces; f++) {
      var edges = net.faceEdges2D[f] || [];
      for (var e = 0; e < edges.length; e++) {
        var ed = edges[e];
        if (ed.hasTab && ed.tabPoly) {
          var tp = ed.tabPoly.map(toScreen);
          ctx.beginPath();
          ctx.moveTo(tp[0].x, tp[0].y);
          for (var ti = 1; ti < tp.length; ti++) ctx.lineTo(tp[ti].x, tp[ti].y);
          ctx.closePath();
          ctx.fillStyle = '#fef3c7';
          ctx.fill();
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.1;
          ctx.setLineDash([]);
          ctx.stroke();

          var midX = 0.25 * (tp[0].x + tp[1].x + tp[2].x + tp[3].x);
          var midY = 0.25 * (tp[0].y + tp[1].y + tp[2].y + tp[3].y);
          ctx.fillStyle = '#92400e';
          ctx.font = '700 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ed.tabLabel, midX, midY);
        }
      }
    }

    // 2. Draw facet polygons
    for (var f2 = 0; f2 < net.nFaces; f2++) {
      var poly = net.poly2D[f2];
      if (!poly) continue;
      var sp = poly.map(toScreen);
      net._screenPolys.push({ fIdx: f2, pts: sp });

      ctx.beginPath();
      ctx.moveTo(sp[0].x, sp[0].y);
      for (var k = 1; k < sp.length; k++) ctx.lineTo(sp[k].x, sp[k].y);
      ctx.closePath();

      var isRoot = (f2 === net.rootIdx);
      var isHov = (f2 === hoveredFaceIdx);
      if (isHov) {
        ctx.fillStyle = 'rgba(217, 119, 6, 0.28)';
      } else if (isRoot) {
        ctx.fillStyle = 'rgba(15, 118, 110, 0.20)';
      } else {
        ctx.fillStyle = 'rgba(230, 246, 244, 0.78)';
      }
      ctx.fill();

      // Draw edges (dashed for internal fold lines, solid for outer cuts)
      var edges2 = net.faceEdges2D[f2] || [];
      for (var e2 = 0; e2 < edges2.length; e2++) {
        var ed2 = edges2[e2];
        var sA = toScreen(ed2.pA), sB = toScreen(ed2.pB);
        ctx.beginPath();
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(sB.x, sB.y);
        if (ed2.isFold) {
          ctx.strokeStyle = '#0f766e';
          ctx.lineWidth = 1.3;
          ctx.setLineDash([4, 3]);
        } else {
          ctx.strokeStyle = '#182022';
          ctx.lineWidth = 1.75;
          ctx.setLineDash([]);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Facet label at centroid
      var fcx = 0, fcy = 0;
      for (var vi = 0; vi < sp.length; vi++) {
        fcx += sp[vi].x; fcy += sp[vi].y;
      }
      fcx /= sp.length; fcy /= sp.length;
      ctx.fillStyle = isRoot ? '#0b5852' : '#334155';
      ctx.font = (isRoot ? '700 10px' : '600 9px') + ' "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isRoot ? ('★ F' + f2) : ('F' + f2), fcx, fcy);

      // Vertex numbers (1..16) near corners
      for (var vj = 0; vj < sp.length; vj++) {
        var vx = sp[vj].x * 0.82 + fcx * 0.18;
        var vy = sp[vj].y * 0.82 + fcy * 0.18;
        ctx.fillStyle = '#0284c7';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.fillText(String(poly[vj].sVal), vx, vy);
      }
    }

    // Header banner on canvas
    ctx.fillStyle = '#0f2528';
    ctx.fillRect(0, 0, W, 28);
    ctx.fillStyle = '#e6f6f4';
    ctx.font = '600 11px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Proposition 4.5 Unfolded Net · ' + net.nFaces + ' Facets · ' +
      net.nFolds + ' Fold Lines (dashed) · ' + net.nTabs + ' Glue Tabs (a–' +
      String.fromCharCode(96 + Math.max(1, net.nTabs)) + ')',
      10, 14
    );
  }

  /**
   * Generates and downloads a standalone printable vector SVG papercraft net
   */
  function downloadPapercraftSVG(mech, printScaleMm) {
    var net = buildPapercraftNet(mech);
    if (!net) return;
    var unitMm = printScaleMm / 3.0;
    var b = net.bounds;
    var padU = 0.55;
    var minX = b.minX - padU, maxX = b.maxX + padU;
    var minY = b.minY - padU, maxY = b.maxY + padU;
    var widthMm = (maxX - minX) * unitMm;
    var heightMm = (maxY - minY + 0.65) * unitMm;

    function tx(x) { return ((x - minX) * unitMm).toFixed(2); }
    function ty(y) { return ((maxY - y + 0.50) * unitMm).toFixed(2); }

    var lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + widthMm.toFixed(1) + 'mm" height="' + heightMm.toFixed(1) + 'mm" viewBox="0 0 ' + widthMm.toFixed(2) + ' ' + heightMm.toFixed(2) + '">');
    lines.push('  <style>');
    lines.push('    .face { fill: #f8faf9; stroke: none; }');
    lines.push('    .root { fill: #e6f6f4; stroke: none; }');
    lines.push('    .tab  { fill: #fef3c7; stroke: #d97706; stroke-width: 0.35; }');
    lines.push('    .cut  { fill: none; stroke: #111827; stroke-width: 0.55; stroke-linecap: round; }');
    lines.push('    .fold { fill: none; stroke: #0f766e; stroke-width: 0.40; stroke-dasharray: 2.2, 1.6; }');
    lines.push('    .lbl  { font-family: Helvetica, Arial, sans-serif; font-size: 3.1px; fill: #1e293b; font-weight: bold; text-anchor: middle; dominant-baseline: central; }');
    lines.push('    .tlbl { font-family: Courier, monospace; font-size: 2.5px; fill: #92400e; font-weight: bold; text-anchor: middle; dominant-baseline: central; }');
    lines.push('    .vlbl { font-family: Courier, monospace; font-size: 2.3px; fill: #0284c7; font-weight: bold; text-anchor: middle; dominant-baseline: central; }');
    lines.push('  </style>');

    var twinTag = mech.isTwin ? ' (Mirror Twin S*)' : '';
    lines.push('  <text x="6" y="6" font-family="Helvetica, Arial, sans-serif" font-size="3.8" font-weight="bold" fill="#0f2528">');
    lines.push('    Magic Gem #' + mech.sqNum + twinTag + ' Papercraft Net · lambda=' + mech.lambda.toFixed(4) + ' · f=(' + mech.outer.fVec.join(', ') + ') · ' + net.nTabs + ' Glue Tabs · Footprint=' + printScaleMm + 'mm');
    lines.push('  </text>');

    // Glue tabs
    for (var f = 0; f < net.nFaces; f++) {
      var edges = net.faceEdges2D[f] || [];
      for (var e = 0; e < edges.length; e++) {
        var ed = edges[e];
        if (ed.hasTab && ed.tabPoly) {
          var ptsStr = ed.tabPoly.map(function (p) { return tx(p.x) + ',' + ty(p.y); }).join(' ');
          lines.push('  <polygon class="tab" points="' + ptsStr + '" />');
          var mX = 0.25 * (ed.tabPoly[0].x + ed.tabPoly[1].x + ed.tabPoly[2].x + ed.tabPoly[3].x);
          var mY = 0.25 * (ed.tabPoly[0].y + ed.tabPoly[1].y + ed.tabPoly[2].y + ed.tabPoly[3].y);
          lines.push('  <text class="tlbl" x="' + tx(mX) + '" y="' + ty(mY) + '">' + ed.tabLabel + '</text>');
        }
      }
    }

    // Facets & edges
    for (var f2 = 0; f2 < net.nFaces; f2++) {
      var poly = net.poly2D[f2];
      if (!poly) continue;
      var pStr = poly.map(function (p) { return tx(p.x) + ',' + ty(p.y); }).join(' ');
      lines.push('  <polygon class="' + (f2 === net.rootIdx ? 'root' : 'face') + '" points="' + pStr + '" />');

      var edges2 = net.faceEdges2D[f2] || [];
      for (var e2 = 0; e2 < edges2.length; e2++) {
        var ed2 = edges2[e2];
        var cls = ed2.isFold ? 'fold' : 'cut';
        lines.push('  <line class="' + cls + '" x1="' + tx(ed2.pA.x) + '" y1="' + ty(ed2.pA.y) + '" x2="' + tx(ed2.pB.x) + '" y2="' + ty(ed2.pB.y) + '" />');
      }

      var cx = 0, cy = 0;
      for (var vi = 0; vi < poly.length; vi++) { cx += poly[vi].x; cy += poly[vi].y; }
      cx /= poly.length; cy /= poly.length;
      lines.push('  <text class="lbl" x="' + tx(cx) + '" y="' + ty(cy) + '">' + (f2 === net.rootIdx ? '★ F' + f2 : 'F' + f2) + '</text>');

      for (var vj = 0; vj < poly.length; vj++) {
        var vx = poly[vj].x * 0.82 + cx * 0.18;
        var vy = poly[vj].y * 0.82 + cy * 0.18;
        lines.push('  <text class="vlbl" x="' + tx(vx) + '" y="' + ty(vy) + '">' + poly[vj].sVal + '</text>');
      }
    }

    lines.push('</svg>');
    var blob = new Blob([lines.join('\n')], { type: 'image/svg+xml;charset=utf-8' });
    var fname = 'magicGem_#' + mech.sqNum + (mech.isTwin ? '_twin' : '') + '_papercraft_net.svg';
    triggerBlobDownload(blob, fname);
  }

  // =========================================================================
  // 4. THREE.JS GEOMETRY BUILDERS & CLIENT-SIDE BINARY STL EXPORTER
  // =========================================================================

  function buildConvexHullBufferGeometry(pts3, faces) {
    var positions = [];
    var normals = [];
    var faceIndices = [];

    for (var fi = 0; fi < faces.length; fi++) {
      var face = faces[fi];
      var lv = face.localVerts;
      var P0 = pts3[lv[0]];
      for (var ti = 1; ti < lv.length - 1; ti++) {
        var P1 = pts3[lv[ti]];
        var P2 = pts3[lv[ti + 1]];
        var ux = P1[0] - P0[0], uy = P1[1] - P0[1], uz = P1[2] - P0[2];
        var vx = P2[0] - P0[0], vy = P2[1] - P0[1], vz = P2[2] - P0[2];
        var nx = uy * vz - uz * vy;
        var ny = uz * vx - ux * vz;
        var nz = ux * vy - uy * vx;
        var nL = Math.hypot(nx, ny, nz) || 1;
        nx /= nL; ny /= nL; nz /= nL;

        positions.push(P0[0], P0[1], P0[2], P1[0], P1[1], P1[2], P2[0], P2[1], P2[2]);
        normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
        faceIndices.push(fi);
      }
    }

    var geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.userData.faceIndices = faceIndices;
    return geom;
  }

  function addCylinderStrutToGroup(group, pA, pB, radius, material, radialSegs) {
    var vA = new THREE.Vector3(pA[0], pA[1], pA[2]);
    var vB = new THREE.Vector3(pB[0], pB[1], pB[2]);
    var dir = new THREE.Vector3().subVectors(vB, vA);
    var len = dir.length();
    if (len < 1e-6 || radius <= 1e-5) return;

    var cylGeom = new THREE.CylinderGeometry(radius, radius, len, radialSegs || 12, 1, false);
    var mid = new THREE.Vector3().addVectors(vA, vB).multiplyScalar(0.5);
    var quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    cylGeom.applyQuaternion(quat);
    cylGeom.translate(mid.x, mid.y, mid.z);

    var mesh = new THREE.Mesh(cylGeom, material);
    group.add(mesh);
  }

  function addSphereNodeToGroup(group, pt, radius, material, segs) {
    if (radius <= 1e-5) return;
    var sphGeom = new THREE.SphereGeometry(radius, segs || 14, segs || 12);
    sphGeom.translate(pt[0], pt[1], pt[2]);
    var mesh = new THREE.Mesh(sphGeom, material);
    group.add(mesh);
  }

  /**
   * Collects all world-space triangles from a THREE.Object3D (excluding helper overlays),
   * scales them to millimeter coordinates (footprint = printScaleMm, shifted so z_min = 0),
   * and returns a binary STL ArrayBuffer.
   */
  function exportObjectToBinarySTL(rootObj, printScaleMm) {
    var unitMm = printScaleMm / 3.0;
    var rawTris = [];
    var minZ = Infinity;

    rootObj.updateMatrixWorld(true);
    rootObj.traverse(function (child) {
      if (!child.isMesh || child.userData.excludeFromSTL) return;
      var geom = child.geometry;
      if (!geom) return;
      var posAttr = geom.getAttribute('position');
      if (!posAttr) return;
      var idxAttr = geom.getIndex();
      var mat = child.matrixWorld;

      function getWorldVert(i) {
        var v = new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(mat);
        v.multiplyScalar(unitMm);
        if (v.z < minZ) minZ = v.z;
        return v;
      }

      if (idxAttr) {
        for (var i = 0; i < idxAttr.count; i += 3) {
          var a = getWorldVert(idxAttr.getX(i));
          var b = getWorldVert(idxAttr.getX(i + 1));
          var c = getWorldVert(idxAttr.getX(i + 2));
          rawTris.push([a, b, c]);
        }
      } else {
        for (var j = 0; j < posAttr.count; j += 3) {
          var a2 = getWorldVert(j);
          var b2 = getWorldVert(j + 1);
          var c2 = getWorldVert(j + 2);
          rawTris.push([a2, b2, c2]);
        }
      }
    });

    if (!isFinite(minZ)) minZ = 0;
    var numTris = rawTris.length;
    var bufLen = 84 + numTris * 50;
    var buffer = new ArrayBuffer(bufLen);
    var view = new DataView(buffer);

    // 80-byte header
    var headerStr = 'Magic Gems 3D Fabrication Studio (Paper C) - Units: mm';
    for (var h = 0; h < 80; h++) {
      view.setUint8(h, h < headerStr.length ? headerStr.charCodeAt(h) : 32);
    }
    view.setUint32(80, numTris, true);

    var offset = 84;
    var u = new THREE.Vector3(), v = new THREE.Vector3(), n = new THREE.Vector3();
    for (var t = 0; t < numTris; t++) {
      var A = rawTris[t][0], B = rawTris[t][1], C = rawTris[t][2];
      u.subVectors(B, A);
      v.subVectors(C, A);
      n.crossVectors(u, v).normalize();

      view.setFloat32(offset, n.x, true); offset += 4;
      view.setFloat32(offset, n.y, true); offset += 4;
      view.setFloat32(offset, n.z, true); offset += 4;

      view.setFloat32(offset, A.x, true); offset += 4;
      view.setFloat32(offset, A.y, true); offset += 4;
      view.setFloat32(offset, A.z - minZ, true); offset += 4;

      view.setFloat32(offset, B.x, true); offset += 4;
      view.setFloat32(offset, B.y, true); offset += 4;
      view.setFloat32(offset, B.z - minZ, true); offset += 4;

      view.setFloat32(offset, C.x, true); offset += 4;
      view.setFloat32(offset, C.y, true); offset += 4;
      view.setFloat32(offset, C.z - minZ, true); offset += 4;

      view.setUint16(offset, 0, true); offset += 2;
    }

    return buffer;
  }

  function triggerBlobDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }

  // =========================================================================
  // 5. LIVE OPENSCAD (.SCAD) PARAMETRIC GENERATOR
  // =========================================================================

  function generateCustomOpenSCAD(mech, archMode, printScaleMm, strutMm) {
    var unitMm = printScaleMm / 3.0;
    var rStrut = (strutMm * 0.5).toFixed(2);
    var twinNote = mech.isTwin ? ' (Mirror Twin S* = r^2(17 - S))' : '';
    var sq = mech.sq;

    var lines = [];
    lines.push('// ============================================================================');
    lines.push('// Magic Gem Parametric OpenSCAD Script — Frenicle Square #' + mech.sqNum + twinNote);
    lines.push('// Companion to Paper C: "Balance in Inequality: Testing the Physical');
    lines.push('// Equilibrium, Precession, and Structural Stability of Magic Gems"');
    lines.push('// Generated by Magic Gems 3D Fabrication Studio');
    lines.push('// ============================================================================');
    lines.push('');
    lines.push('$fn = 36;');
    lines.push('frenicle_id  = ' + mech.sqNum + '; // Group ' + mech.groupCode + ', f = (' + mech.outer.fVec.join(', ') + ')');
    lines.push('lambda_lift  = ' + mech.lambda.toFixed(4) + ';');
    lines.push('footprint_mm = ' + printScaleMm.toFixed(1) + ';');
    lines.push('unit_mm      = footprint_mm / 3.0; // ' + unitMm.toFixed(3) + ' mm per grid unit');
    lines.push('strut_r_mm   = ' + rStrut + ';');
    lines.push('arch_mode    = "' + archMode + '"; // "solid", "dual", "wireframe", "k16", "radial"');
    lines.push('');
    lines.push('// 4x4 Magic Square Matrix S (sum = 34):');
    for (var r = 0; r < 4; r++) {
      lines.push('//   [' + sq.slice(4 * r, 4 * r + 4).map(function (n) { return (' ' + n).slice(-2); }).join(', ') + ' ]');
    }
    lines.push('');
    lines.push('// 16 Lifted Point Coordinates in mm [x, y, z]:');
    lines.push('pts16 = [');
    for (var i = 0; i < 16; i++) {
      var p = mech.ptsLambda[i];
      var xm = (p[0] * unitMm).toFixed(3);
      var ym = (p[1] * unitMm).toFixed(3);
      var zm = (p[2] * unitMm).toFixed(3);
      var role = mech.pointRole[i];
      lines.push('  [' + xm + ', ' + ym + ', ' + zm + ']' + (i < 15 ? ',' : ' ') + ' // idx ' + i + ': s=' + p[3] + ' (' + role + ')');
    }
    lines.push('];');
    lines.push('');
    lines.push('outer_v0_indices = [' + mech.outer.vIds.join(', ') + '];');
    var innerIndices = [];
    for (var k = 0; k < 16; k++) {
      if (mech.pointRole[k] !== 'outer') innerIndices.push(k);
    }
    lines.push('inner_core_indices = [' + innerIndices.join(', ') + '];');
    lines.push('');
    lines.push('module strut(p1, p2, r) {');
    lines.push('  v = p2 - p1;');
    lines.push('  L = norm(v);');
    lines.push('  if (L > 0.001) {');
    lines.push('    translate(p1)');
    lines.push('      rotate([0, acos(v[2]/L), atan2(v[1], v[0])])');
    lines.push('        cylinder(h = L, r = r);');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('module solid_outer_hull() {');
    lines.push('  hull() {');
    lines.push('    for (i = outer_v0_indices)');
    lines.push('      translate(pts16[i]) sphere(r = 0.05);');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('module solid_inner_core() {');
    lines.push('  if (len(inner_core_indices) >= 4) {');
    lines.push('    hull() {');
    lines.push('      for (i = inner_core_indices)');
    lines.push('        translate(pts16[i]) sphere(r = 0.05);');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('module complete_k16_struts(r) {');
    lines.push('  for (i = [0 : 14])');
    lines.push('    for (j = [i + 1 : 15])');
    lines.push('      strut(pts16[i], pts16[j], r);');
    lines.push('  for (i = [0 : 15])');
    lines.push('    translate(pts16[i]) sphere(r = r * 1.35);');
    lines.push('}');
    lines.push('');
    lines.push('module radial_hub_star(r) {');
    lines.push('  sphere(r = r * 2.2); // Central fulcrum hub O');
    lines.push('  for (i = [0 : 15]) {');
    lines.push('    strut([0, 0, 0], pts16[i], r);');
    lines.push('    translate(pts16[i]) sphere(r = r * 1.45);');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('// Render selected fabrication architecture:');
    lines.push('if (arch_mode == "dual") {');
    lines.push('  %solid_outer_hull(); // Translucent outer shell G_0');
    lines.push('  color("Gold") solid_inner_core(); // Inner core G_1 (Delta_rho_1/rho_0 = ' + mech.rhoRatioStr + ')');
    lines.push('} else if (arch_mode == "k16" || arch_mode == "wireframe") {');
    lines.push('  complete_k16_struts(strut_r_mm);');
    lines.push('} else if (arch_mode == "radial") {');
    lines.push('  radial_hub_star(strut_r_mm);');
    lines.push('} else {');
    lines.push('  solid_outer_hull();');
    lines.push('}');
    return lines.join('\n');
  }

  // =========================================================================
  // 6. MAIN STUDIO STATE & SECTION 1 3D SCENE CONTROLLER
  // =========================================================================

  var GROUP_NAMES = {
    'I': 'Group I',
    'II': 'Group II',
    'III': 'Group III (Associative / Symmetric)',
    'IV': 'Group IV (Simple)',
    'V': 'Group V',
    'VI': 'Group VI (Pandiagonal / Nasik)',
    'VII': 'Group VII',
    'VIII': 'Group VIII',
    'IX': 'Group IX',
    'X': 'Group X',
    'XI': 'Group XI',
    'XII': 'Group XII'
  };

  var state = {
    sqNum: 175,
    isTwin: false,
    lambda: 0.20,
    printScaleMm: 60,
    strutMm: 2.4,
    archMode: 'solid', // 'solid', 'dual', 'wireframe', 'k16', 'radial', 'papercraft'
    wireRatioMode: 'auto', // 'auto' (Theorem 4.4 d1/d0) or 'equal' (d1=d0)
    k16MuMode: 'mu0', // 'mu0' (Equal-mass tapered, balanced) or 'mu1' (Uniform gauge)
    radialBeta: 1, // 1 (Constant-gauge rod), 0 (Point mass), 3 (Conical horn)
    autoRotate: true,
    showWireOverlay: false,
    showAxesAndCoM: true,
    hoveredFaceIdx: -1,
    activeScadTab: 'custom',
    mech: null,
    net: null,
    scadFiles: {
      magicGem: '// Loading magicGem.scad...',
      ring: '// Loading weighted_ring.scad...'
    }
  };

  // Section 1 Three.js objects
  var genScene, genCamera, genRenderer, genControls;
  var genPrintableGroup, genOuterOnlyGroup, genInnerOnlyGroup, genHelperGroup;
  var genHullMeshForRay = null;

  function initSection1Generator() {
    var container = document.getElementById('gen-3d-container');
    if (!container || typeof THREE === 'undefined') return;

    var w = container.clientWidth || 640;
    var h = container.clientHeight || 460;

    genScene = new THREE.Scene();
    genScene.background = new THREE.Color(0x0d1f22);

    genCamera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    genCamera.position.set(4.6, -4.9, 3.6);
    genCamera.up.set(0, 0, 1);

    genRenderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    genRenderer.setSize(w, h);
    genRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(genRenderer.domElement);

    genControls = new THREE.OrbitControls(genCamera, genRenderer.domElement);
    genControls.enableDamping = true;
    genControls.dampingFactor = 0.06;
    genControls.autoRotate = state.autoRotate;
    genControls.autoRotateSpeed = 1.15;

    // Studio lighting
    var amb = new THREE.AmbientLight(0xffffff, 0.62);
    genScene.add(amb);
    var dir1 = new THREE.DirectionalLight(0xfffbeb, 0.88);
    dir1.position.set(7, -8, 10);
    genScene.add(dir1);
    var dir2 = new THREE.DirectionalLight(0x5eead4, 0.45);
    dir2.position.set(-8, 7, -5);
    genScene.add(dir2);

    genPrintableGroup = new THREE.Group();
    genOuterOnlyGroup = new THREE.Group();
    genInnerOnlyGroup = new THREE.Group();
    genHelperGroup = new THREE.Group();
    genScene.add(genPrintableGroup);
    genScene.add(genHelperGroup);

    // Raycaster for 3D <-> 2D facet hover in papercraft mode
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    genRenderer.domElement.addEventListener('mousemove', function (ev) {
      if (state.archMode !== 'papercraft' || !genHullMeshForRay) return;
      var rect = genRenderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, genCamera);
      var hits = raycaster.intersectObject(genHullMeshForRay, false);
      var newFaceIdx = -1;
      if (hits.length > 0 && hits[0].faceIndex != null) {
        var fMap = genHullMeshForRay.geometry.userData.faceIndices;
        if (fMap && fMap[hits[0].faceIndex] !== undefined) {
          newFaceIdx = fMap[hits[0].faceIndex];
        }
      }
      if (newFaceIdx !== state.hoveredFaceIdx) {
        state.hoveredFaceIdx = newFaceIdx;
        renderPapercraftCanvas(document.getElementById('gen-net-canvas'), state.net, state.mech, state.hoveredFaceIdx);
      }
    });

    // 2D Net Canvas hover -> highlight facet
    var netCanvas = document.getElementById('gen-net-canvas');
    if (netCanvas) {
      netCanvas.addEventListener('mousemove', function (ev) {
        if (!state.net || !state.net._screenPolys) return;
        var rect = netCanvas.getBoundingClientRect();
        var sx = (ev.clientX - rect.left) * (netCanvas.width / rect.width);
        var sy = (ev.clientY - rect.top) * (netCanvas.height / rect.height);
        var found = -1;
        for (var i = 0; i < state.net._screenPolys.length; i++) {
          var item = state.net._screenPolys[i];
          if (pointInPoly2D(sx, sy, item.pts)) {
            found = item.fIdx;
            break;
          }
        }
        if (found !== state.hoveredFaceIdx) {
          state.hoveredFaceIdx = found;
          renderPapercraftCanvas(netCanvas, state.net, state.mech, state.hoveredFaceIdx);
        }
      });
    }

    window.addEventListener('resize', handleGeneratorResize);
  }

  function pointInPoly2D(x, y, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i].x, yi = pts[i].y;
      var xj = pts[j].x, yj = pts[j].y;
      var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function handleGeneratorResize() {
    var container = document.getElementById('gen-3d-container');
    if (!container || !genRenderer || !genCamera) return;
    var w = container.clientWidth || 500;
    var h = container.clientHeight || 460;
    genCamera.aspect = w / h;
    genCamera.updateProjectionMatrix();
    genRenderer.setSize(w, h);
  }

  function clearGroup(grp) {
    if (!grp) return;
    while (grp.children.length > 0) {
      var ch = grp.children[0];
      grp.remove(ch);
      if (ch.geometry) ch.geometry.dispose();
    }
  }

  /**
   * Rebuilds the 3D mesh, 2D net, and mechanical readouts whenever any parameter changes
   */
  function rebuildStudioScene() {
    var mech = analyzeSquareMechanics(state.sqNum, state.isTwin, state.lambda);
    state.mech = mech;
    state.net = buildPapercraftNet(mech);

    clearGroup(genPrintableGroup);
    clearGroup(genOuterOnlyGroup);
    clearGroup(genInnerOnlyGroup);
    clearGroup(genHelperGroup);
    genHullMeshForRay = null;

    var unitMm = state.printScaleMm / 3.0;
    var r0Scene = (state.strutMm * 0.5) / unitMm; // Strut radius in 3-unit scene coords
    var pts3 = mech.ptsLambda;

    // Materials
    var matSolidTeal = new THREE.MeshPhysicalMaterial({
      color: 0x14b8a6,
      roughness: 0.26,
      metalness: 0.08,
      clearcoat: 0.35,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });
    var matOuterGlass = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.34,
      roughness: 0.15,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
      flatShading: true
    });
    var matInnerAmber = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.22,
      flatShading: true
    });
    var matInnerCavity = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.30,
      metalness: 0.15,
      flatShading: true
    });
    var matStrutOuter = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      roughness: 0.3,
      metalness: 0.35
    });
    var matStrutInner = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.28,
      metalness: 0.40
    });
    var matNodeOuter = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.25,
      metalness: 0.3
    });
    var matNodeFace = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      roughness: 0.25,
      metalness: 0.3
    });
    var matNodeInt = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.35
    });

    // Show/hide 2D papercraft split pane
    var netContainer = document.getElementById('gen-net-container');
    if (netContainer) {
      netContainer.style.display = (state.archMode === 'papercraft') ? 'flex' : 'none';
      handleGeneratorResize();
    }

    if (state.archMode === 'solid' || state.archMode === 'papercraft') {
      var outerGeom = buildConvexHullBufferGeometry(pts3, mech.outer.faces);
      var outerMesh = new THREE.Mesh(outerGeom, matSolidTeal);
      genPrintableGroup.add(outerMesh);
      genHullMeshForRay = outerMesh;

      // Crisp facet crease lines (helper, excluded from STL)
      var edgesGeom = new THREE.EdgesGeometry(outerGeom, 1);
      var edgesLine = new THREE.LineSegments(
        edgesGeom,
        new THREE.LineBasicMaterial({ color: 0xccfbf1, transparent: true, opacity: 0.65 })
      );
      edgesLine.userData.excludeFromSTL = true;
      genHelperGroup.add(edgesLine);

      if (state.archMode === 'papercraft') {
        renderPapercraftCanvas(document.getElementById('gen-net-canvas'), state.net, mech, state.hoveredFaceIdx);
      }
    } else if (state.archMode === 'dual') {
      // Translucent Outer Hull G_0 + Solid Inner Core G_1
      var g0Geom = buildConvexHullBufferGeometry(pts3, mech.outer.faces);
      var g0MeshVis = new THREE.Mesh(g0Geom, matOuterGlass);
      genPrintableGroup.add(g0MeshVis);
      genOuterOnlyGroup.add(new THREE.Mesh(g0Geom.clone(), matSolidTeal));

      var edgesG0 = new THREE.EdgesGeometry(g0Geom, 1);
      var lineG0 = new THREE.LineSegments(
        edgesG0,
        new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.75 })
      );
      lineG0.userData.excludeFromSTL = true;
      genHelperGroup.add(lineG0);

      // Build Inner Core G_1
      var nonExtPts3 = [];
      for (var p = 0; p < 16; p++) {
        if (mech.pointRole[p] !== 'outer') nonExtPts3.push(pts3[p]);
      }
      if (mech.inner.rank === 3 && mech.inner.faces.length > 0) {
        var g1Geom = buildConvexHullBufferGeometry(nonExtPts3, mech.inner.faces);
        var isHollowCavity = (mech.rhoRatioVal !== null && mech.rhoRatioVal < 0);
        var g1Mat = isHollowCavity ? matInnerCavity : matInnerAmber;
        var g1Mesh = new THREE.Mesh(g1Geom, g1Mat);
        genPrintableGroup.add(g1Mesh);
        genInnerOnlyGroup.add(new THREE.Mesh(g1Geom.clone(), g1Mat));

        var edgesG1 = new THREE.EdgesGeometry(g1Geom, 1);
        var lineG1 = new THREE.LineSegments(
          edgesG1,
          new THREE.LineBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.9 })
        );
        lineG1.userData.excludeFromSTL = true;
        genHelperGroup.add(lineG1);
      } else if (mech.inner.edges && mech.inner.edges.length > 0) {
        // Degenerate planar/segment inner core: render thick inner struts so it's visible & printable
        for (var ie = 0; ie < mech.inner.edges.length; ie++) {
          var edIn = mech.inner.edges[ie];
          var uG = Array.isArray(edIn) ? edIn[0] : edIn.uGlobal;
          var vG = Array.isArray(edIn) ? edIn[1] : edIn.vGlobal;
          addCylinderStrutToGroup(genPrintableGroup, pts3[uG], pts3[vG], r0Scene * 1.1, matInnerAmber, 12);
          addCylinderStrutToGroup(genInnerOnlyGroup, pts3[uG], pts3[vG], r0Scene * 1.1, matInnerAmber, 12);
        }
      }

      // Highlight the 16 grid points by role
      for (var vi = 0; vi < 16; vi++) {
        var rMat = mech.pointRole[vi] === 'outer' ? matNodeOuter : (mech.pointRole[vi] === 'face' ? matNodeFace : matNodeInt);
        addSphereNodeToGroup(genHelperGroup, pts3[vi], r0Scene * 1.15, rMat, 12);
      }
    } else if (state.archMode === 'wireframe') {
      // Mode 3: Nested Ball-and-Rod Wireframe G(G_0) U G(G_1)
      var rOuter = r0Scene;
      var rInner = r0Scene;
      if (state.wireRatioMode === 'auto' && mech.wireStats.ratio !== null) {
        rInner = r0Scene * Math.min(2.5, Math.max(0.25, mech.wireStats.ratio));
      }

      for (var eo = 0; eo < mech.outer.edges.length; eo++) {
        var eOut = mech.outer.edges[eo];
        addCylinderStrutToGroup(genPrintableGroup, pts3[eOut.uGlobal], pts3[eOut.vGlobal], rOuter, matStrutOuter, 12);
      }
      if (mech.inner.edges && mech.inner.edges.length > 0 && rInner > 1e-4) {
        for (var ei2 = 0; ei2 < mech.inner.edges.length; ei2++) {
          var eIn = mech.inner.edges[ei2];
          var uId = Array.isArray(eIn) ? eIn[0] : eIn.uGlobal;
          var vId = Array.isArray(eIn) ? eIn.vGlobal : eIn[1];
          addCylinderStrutToGroup(genPrintableGroup, pts3[uId], pts3[vId], rInner, matStrutInner, 12);
        }
      }
      for (var nIdx = 0; nIdx < 16; nIdx++) {
        var nRole = mech.pointRole[nIdx];
        var nMat = nRole === 'outer' ? matNodeOuter : (nRole === 'face' ? matNodeFace : matNodeInt);
        var nRad = (nRole === 'outer' ? rOuter : Math.max(rOuter * 0.8, rInner)) * 1.32;
        addSphereNodeToGroup(genPrintableGroup, pts3[nIdx], nRad, nMat, 14);
      }
    } else if (state.archMode === 'k16') {
      // Mode 4: Complete K_16 Strut Network (120 Rods + 16 Nodes)
      // Theorem 4.4: mu=0 tapers radius r_{ij} proportional to 1/sqrt(|p_i - p_j|) so every strut has equal mass
      var refLen = 2.2;
      for (var i1 = 0; i1 < 15; i1++) {
        for (var i2 = i1 + 1; i2 < 16; i2++) {
          var pA = pts3[i1], pB = pts3[i2];
          var dLen = Math.hypot(pA[0] - pB[0], pA[1] - pB[1], pA[2] - pB[2]);
          var rRod = r0Scene * 0.68;
          if (state.k16MuMode === 'mu0' && dLen > 0.1) {
            rRod = r0Scene * 0.68 * Math.sqrt(refLen / dLen);
          }
          addCylinderStrutToGroup(genPrintableGroup, pA, pB, rRod, matStrutOuter, 8);
        }
      }
      for (var nk = 0; nk < 16; nk++) {
        var nkMat = mech.pointRole[nk] === 'outer' ? matNodeOuter : matNodeInt;
        addSphereNodeToGroup(genPrintableGroup, pts3[nk], r0Scene * 1.15, nkMat, 12);
      }
    } else if (state.archMode === 'radial') {
      // Mode 5: 16-Spoke Radial Hub Star (Section 2, Theorem 2.1)
      var originPt = [0, 0, 0];
      addSphereNodeToGroup(genPrintableGroup, originPt, r0Scene * 2.25, matInnerAmber, 16);
      for (var sr = 0; sr < 16; sr++) {
        var tip = pts3[sr];
        if (state.radialBeta === 0) {
          // Beta = 0: thin massless-like spoke + heavy terminal sphere
          addCylinderStrutToGroup(genPrintableGroup, originPt, tip, r0Scene * 0.55, matStrutOuter, 10);
          addSphereNodeToGroup(genPrintableGroup, tip, r0Scene * 1.95, matNodeOuter, 14);
        } else if (state.radialBeta === 3) {
          // Beta = 3: flared conical horn
          var vTip = new THREE.Vector3(tip[0], tip[1], tip[2]);
          var lenSpoke = vTip.length();
          if (lenSpoke > 1e-4) {
            var coneGeom = new THREE.CylinderGeometry(r0Scene * 1.85, r0Scene * 0.45, lenSpoke, 14, 1, false);
            var midSpoke = vTip.clone().multiplyScalar(0.5);
            var qSpoke = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vTip.clone().normalize());
            coneGeom.applyQuaternion(qSpoke);
            coneGeom.translate(midSpoke.x, midSpoke.y, midSpoke.z);
            genPrintableGroup.add(new THREE.Mesh(coneGeom, matStrutOuter));
          }
        } else {
          // Beta = 1: constant-gauge cylindrical spoke (Theorem 2.1 default)
          addCylinderStrutToGroup(genPrintableGroup, originPt, tip, r0Scene * 1.05, matStrutOuter, 12);
          addSphereNodeToGroup(genPrintableGroup, tip, r0Scene * 1.38, matNodeOuter, 14);
        }
      }
    }

    // Apply wireframe overlay toggle if active
    if (state.showWireOverlay) {
      genPrintableGroup.traverse(function (ch) {
        if (ch.isMesh && ch.material) ch.material.wireframe = true;
      });
    }

    // Origin fulcrum O=(0,0,0) and solid centroid c_0(lambda) markers
    if (state.showAxesAndCoM) {
      var axes = new THREE.AxesHelper(2.35);
      axes.userData.excludeFromSTL = true;
      genHelperGroup.add(axes);

      // Emerald sphere at geometric origin O = (0,0,0)
      var origSph = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
      );
      origSph.userData.excludeFromSTL = true;
      genHelperGroup.add(origSph);

      // Crimson sphere at uncorrected solid centroid c_0(lambda) if displaced
      var c0Scene = [mech.outer.c0[0], mech.outer.c0[1], state.lambda * mech.outer.c0[2]];
      if (Math.hypot(c0Scene[0], c0Scene[1], c0Scene[2]) > 1e-4) {
        var comSph = new THREE.Mesh(
          new THREE.SphereGeometry(0.095, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xf43f5e })
        );
        comSph.position.set(c0Scene[0], c0Scene[1], c0Scene[2]);
        comSph.userData.excludeFromSTL = true;
        genHelperGroup.add(comSph);
      }
    }

    updateStudioReadoutsUI(mech);
    updateOpenSCADDisplay();
  }

  // =========================================================================
  // 7. DOM READOUTS & SUB-CONTROL UPDATER
  // =========================================================================

  function updateStudioReadoutsUI(mech) {
    var twinLabel = mech.isTwin ? ' · Mirror Twin S* = r²(17−S)' : '';
    var archLabels = {
      solid: 'Solid Convex Hull G_λ(S)',
      dual: 'Dual-Material "Diamond-in-a-Diamond" (G₀ + G₁)',
      wireframe: 'Nested Ball-&-Rod Wireframe G(G₀) ∪ G(G₁)',
      k16: 'Complete K₁₆ Strut Network (120 Rods)',
      radial: '16-Spoke Radial Hub Star (Section 2)',
      papercraft: '2D Unfolded Papercraft Cutout Net'
    };

    var hdrEl = document.getElementById('gen-header-status');
    if (hdrEl) {
      hdrEl.textContent = 'Frénicle Square #' + mech.sqNum + twinLabel + ' (' +
        (GROUP_NAMES[mech.groupCode] || ('Group ' + mech.groupCode)) + ') — ' +
        (archLabels[state.archMode] || state.archMode);
    }

    // Viewport badges
    var bLeft = document.getElementById('badge-left-top');
    if (bLeft) {
      bLeft.textContent = 'Square #' + mech.sqNum + (mech.isTwin ? '*' : '') +
        ' · Group ' + mech.groupCode + ' · f = (' + mech.outer.fVec.join(', ') + ')';
    }
    var bRight = document.getElementById('badge-right-top');
    if (bRight) {
      var heightMm = (15 * state.lambda * (state.printScaleMm / 3.0)).toFixed(1);
      bRight.textContent = 'Footprint: ' + state.printScaleMm + '×' + state.printScaleMm +
        ' mm · Height: ' + heightMm + ' mm';
    }

    // Export button filenames & Dual-Material buttons visibility
    var fname = 'magicGem_#' + mech.sqNum + (mech.isTwin ? '_twin' : '') + '_' +
      state.archMode + '_lam' + state.lambda.toFixed(2) + '.stl';
    var fnEl = document.getElementById('dl-stl-filename');
    if (fnEl) fnEl.textContent = fname;

    var dualBtns = document.getElementById('dual-stl-btns');
    if (dualBtns) {
      dualBtns.style.display = (state.archMode === 'dual') ? 'flex' : 'none';
    }

    // 4x4 Matrix Grid
    var matTitle = document.getElementById('matrix-box-title');
    if (matTitle) {
      matTitle.textContent = 'Square #' + mech.sqNum + (mech.isTwin ? ' (Twin S*)' : '') + ' (4×4)';
    }
    var matGrid = document.getElementById('gen-matrix-grid');
    if (matGrid) {
      matGrid.innerHTML = '';
      for (var i = 0; i < 16; i++) {
        var cell = document.createElement('div');
        var role = mech.pointRole[i];
        cell.className = 'sq-cell v-' + role;
        var sVal = mech.sq[i];
        var zVal = (sVal - 8.5).toFixed(1);
        cell.innerHTML = '<span>' + sVal + '</span><span class="z-sub">' + (sVal > 8.5 ? '+' + zVal : zVal) + '</span>';
        cell.title = 'Entry s=' + sVal + ' · Role: ' +
          (role === 'outer' ? 'Outer Hull Corner V₀' : (role === 'face' ? 'Hull Face Point V_face' : 'Strictly Interior V_int'));
        matGrid.appendChild(cell);
      }
    }
    document.getElementById('cnt-v0').textContent = String(mech.counts.v0);
    document.getElementById('cnt-vface').textContent = String(mech.counts.vface);
    document.getElementById('cnt-vint').textContent = String(mech.counts.vint);

    // Mechanical stats rows
    document.getElementById('ro-group').textContent = GROUP_NAMES[mech.groupCode] || ('Group ' + mech.groupCode);
    document.getElementById('ro-fvec').textContent = '(' + mech.outer.fVec.join(', ') + ') · V−E+F = 2 ✓';
    var nTabs = mech.outer.fVec[0] - 1;
    var nFolds = mech.outer.fVec[2] - 1;
    document.getElementById('ro-tabs').textContent = 'N_tabs = f₀−1 = ' + nTabs + ' tabs (' + nFolds + ' folds)';

    var vol1Disp = mech.inner.rank === 3 ? mech.inner.volStr : ('0 (rk ' + mech.inner.rank + ')');
    document.getElementById('ro-vols').textContent = 'G₀: ' + mech.outer.volStr + ' · G₁: ' + vol1Disp;

    var isC0Zero = (mech.outer.c0[0] === 0 && mech.outer.c0[1] === 0 && mech.outer.c0[2] === 0);
    var c0Disp = '(' + mech.outer.c0Str[0] + ', ' + mech.outer.c0Str[1] + ', ' +
      (mech.outer.c0[2] === 0 ? '0' : (mech.outer.c0Str[2] + '·λ')) + ')';
    document.getElementById('ro-c0').textContent = c0Disp + (isC0Zero ? ' [Balanced ✓]' : ' [Needs core]');

    if (state.archMode === 'wireframe' || state.archMode === 'k16') {
      document.getElementById('ro-balance').textContent = mech.wireStats.note;
    } else {
      document.getElementById('ro-balance').textContent = 'Δρ₁/ρ₀ = ' + mech.rhoRatioStr;
    }

    document.getElementById('ro-qxy').textContent = '|Q_xy| = ' + Math.abs(mech.Qxy).toFixed(0) +
      ' · I⊥/I_zz = ' + mech.inertiaRatio.toFixed(3);

    var pctStab = mech.stability.totalFaces > 0
      ? ((100 * mech.stability.stableCount) / mech.stability.totalFaces).toFixed(1)
      : '0.0';
    document.getElementById('ro-stab').textContent = mech.stability.stableCount + ' / ' +
      mech.stability.totalFaces + ' (' + pctStab + '%) · max ' + mech.stability.maxTipDeg.toFixed(1) + '°';

    // Contextual fabrication note
    var noteEl = document.getElementById('arch-note-box');
    if (noteEl) {
      if (state.archMode === 'dual') {
        noteEl.innerHTML = '<strong>Theorem 4.3 Dual-Material Balance:</strong> Print outer shell $\\mathcal{G}_0$ at base infill $\\rho_0$ and inner core $\\mathcal{G}_1$ with density offset $\\Delta\\rho_1/\\rho_0 = ' +
          mech.rhoRatioStr + '$. ' + (mech.isTwin ? 'Mirror Twin $S^*$ negates $\\mathbf{c}_0$ and $\\mathbf{c}_1$ simultaneously, leaving $\\Delta\\rho_1/\\rho_0$ invariant!' : 'Use the two STL buttons above to load both shells into a dual-extruder slicer.');
      } else if (state.archMode === 'wireframe') {
        noteEl.innerHTML = '<strong>Theorem 4.4 Nested Wireframe:</strong> ' + mech.wireStats.note +
          '. Outer 1-skeleton has $f_1 = ' + mech.outer.fVec[1] + '$ rods; inner core has $' +
          (mech.inner.edges ? mech.inner.edges.length : 0) + '$ rods.';
      } else if (state.archMode === 'k16') {
        noteEl.innerHTML = '<strong>Theorem 4.4 Complete $K_{16}$ Lattice:</strong> Connects all $\\binom{16}{2}=120$ vertex pairs. In <em>Equal-Mass Tapered ($\\mu=0$)</em> mode, rod gauge scales as $\\ell_{ij}^{-1/2}$ so the centroid coincides with the origin $O$ for every one of the 880 squares.';
      } else if (state.archMode === 'radial') {
        noteEl.innerHTML = '<strong>Section 2 Radial Hub Star:</strong> 16 radial spokes emanate from the central fulcrum hub $O=(0,0,0)$. For Group VI pandiagonal squares like <strong>#70</strong> at $\\lambda=0.20$ ($v/u = 9/4$), constant-gauge spokes ($\\beta=1$) satisfy exact Pell radial equilibrium $\\sum m_i \\mathbf{p}_i = \\mathbf{0}$.';
      } else if (state.archMode === 'papercraft') {
        noteEl.innerHTML = '<strong>Proposition 4.5 Unfolded Papercraft Net:</strong> Spanning-tree unfolding of all $f_2 = ' +
          mech.outer.fVec[2] + '$ facets with $f_2 - 1 = ' + nFolds + '$ internal dashed fold lines and $N_{\\mathrm{tabs}} = f_0 - 1 = ' +
          nTabs + '$ labeled glue tabs. Click <strong>Download Printable SVG Net</strong> above to print and score on cardstock.';
      } else {
        noteEl.innerHTML = '<strong>Sections 3–5 Solid Convex Hull $\\mathcal{G}_\\lambda(S)$:</strong> Watertight manifold polyhedron with $f = (' +
          mech.outer.fVec.join(', ') + ')$. At $\\lambda = ' + state.lambda.toFixed(4) + '$, $' +
          mech.stability.stableCount + '/' + mech.stability.totalFaces + '$ facets (' + pctStab + '%) are gravitationally stable resting bases.';
      }
      if (typeof window.renderMathInElement === 'function') {
        window.renderMathInElement(noteEl, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ]
        });
      }
    }
  }

  function renderModeSubControls() {
    var wrap = document.getElementById('mode-subctrl-wrap');
    var lbl = document.getElementById('mode-subctrl-label');
    var row = document.getElementById('mode-subctrl-row');
    if (!wrap || !lbl || !row) return;

    row.innerHTML = '';
    if (state.archMode === 'wireframe') {
      wrap.style.display = 'flex';
      lbl.textContent = 'Inner Strut Ratio d₁/d₀';
      var bAuto = document.createElement('button');
      bAuto.className = 'mini-btn' + (state.wireRatioMode === 'auto' ? ' active' : '');
      bAuto.textContent = 'Thm 4.4 Balanced d₁/d₀';
      bAuto.onclick = function () { state.wireRatioMode = 'auto'; renderModeSubControls(); rebuildStudioScene(); };
      var bEq = document.createElement('button');
      bEq.className = 'mini-btn' + (state.wireRatioMode === 'equal' ? ' active' : '');
      bEq.textContent = 'Uniform d₁ = d₀';
      bEq.onclick = function () { state.wireRatioMode = 'equal'; renderModeSubControls(); rebuildStudioScene(); };
      row.appendChild(bAuto);
      row.appendChild(bEq);
    } else if (state.archMode === 'k16') {
      wrap.style.display = 'flex';
      lbl.textContent = 'K₁₆ Mass Exponent μ';
      var bMu0 = document.createElement('button');
      bMu0.className = 'mini-btn' + (state.k16MuMode === 'mu0' ? ' active' : '');
      bMu0.textContent = 'μ = 0 (Equal-Mass Balanced)';
      bMu0.onclick = function () { state.k16MuMode = 'mu0'; renderModeSubControls(); rebuildStudioScene(); };
      var bMu1 = document.createElement('button');
      bMu1.className = 'mini-btn' + (state.k16MuMode === 'mu1' ? ' active' : '');
      bMu1.textContent = 'μ = 1 (Uniform Gauge)';
      bMu1.onclick = function () { state.k16MuMode = 'mu1'; renderModeSubControls(); rebuildStudioScene(); };
      row.appendChild(bMu0);
      row.appendChild(bMu1);
    } else if (state.archMode === 'radial') {
      wrap.style.display = 'flex';
      lbl.textContent = 'Radial Spoke Profile β';
      [
        { b: 1, txt: 'β = 1 (Uniform Rod)' },
        { b: 0, txt: 'β = 0 (Terminal Ball)' },
        { b: 3, txt: 'β = 3 (Conical Horn)' }
      ].forEach(function (item) {
        var btn = document.createElement('button');
        btn.className = 'mini-btn' + (state.radialBeta === item.b ? ' active' : '');
        btn.textContent = item.txt;
        btn.onclick = function () { state.radialBeta = item.b; renderModeSubControls(); rebuildStudioScene(); };
        row.appendChild(btn);
      });
    } else {
      wrap.style.display = 'none';
    }
  }

  // =========================================================================
  // 8. SECTION 2: CURATED REFERENCE STL MODELS (SHARED WEBGL RENDERER)
  // =========================================================================

  var REFERENCE_MODELS = [
    {
      id: 'v1',
      file: 'magicGem_v1.stl',
      title: 'magicGem_v1.stl — 8-Vertex Outer Hull Wireframe',
      sqNum: 51,
      arch: 'wireframe',
      badges: [
        { text: 'Frénicle #51 · Group VI', cls: 'c-emerald' },
        { text: 'V₀ = 8, V_face = 4, V_int = 4', cls: 'c-cobalt' },
        { text: 'Section 4 · Outer 1-Skeleton', cls: 'c-amber' }
      ],
      desc: 'Ball-and-rod wireframe of the 8-vertex outer hull of pandiagonal Square #51 (f = (8, 14, 8)), where 4 entries lie on facet planes and 4 lie strictly inside.'
    },
    {
      id: 'v2',
      file: 'magicGem_v2.stl',
      title: 'magicGem_v2.stl — Complete K₁₆ 120-Rod Strut Lattice',
      sqNum: 43,
      arch: 'k16',
      badges: [
        { text: 'Frénicle #43 · Group VIII', cls: 'c-emerald' },
        { text: 'V₀ = 9, V_face = 3, V_int = 4', cls: 'c-cobalt' },
        { text: 'Theorem 4.4 · 120 Struts', cls: 'c-amber' }
      ],
      desc: 'Complete 16-vertex K₁₆ strut network connecting all 120 pairs of lifted grid points for Square #43, illustrating Theorem 4.4 wireframe mechanics.'
    },
    {
      id: 'v3',
      file: 'magicGem_v3.stl',
      title: 'magicGem_v3.stl — 10-Vertex Pandiagonal Hull (f = 10, 20, 12)',
      sqNum: 6,
      arch: 'solid',
      badges: [
        { text: 'Frénicle #6 · Group VI', cls: 'c-emerald' },
        { text: 'V₀ = 10, V_face = 2, V_int = 4', cls: 'c-cobalt' },
        { text: 'Section 5 · Resting Hull', cls: 'c-amber' }
      ],
      desc: 'Solid convex hull of pandiagonal Square #6 with 10 extreme hull vertices, 2 coplanar face points, and 4 interior core vertices.'
    },
    {
      id: 'v4',
      file: 'magicGem_v4_end.stl',
      title: 'magicGem_v4_end.stl — Zero-Interior Hull (V_int = 0)',
      sqNum: 12,
      arch: 'solid',
      badges: [
        { text: 'Frénicle #12 · Group VI', cls: 'c-emerald' },
        { text: 'V₀ = 10, V_face = 6, V_int = 0', cls: 'c-cobalt' },
        { text: 'Section 4 · All 16 on ∂G₀', cls: 'c-amber' }
      ],
      desc: 'Boundary-saturated pandiagonal gem (#12) where all 6 non-corner points lie strictly on the facets of ∂G₀, leaving zero strictly interior points.'
    },
    {
      id: 'v5',
      file: 'magicGem_v5_end-1.stl',
      title: 'magicGem_v5_end-1.stl — 2-Point Interior Segment Core',
      sqNum: 18,
      arch: 'solid',
      badges: [
        { text: 'Frénicle #18 · Group VI', cls: 'c-emerald' },
        { text: 'V₀ = 10, V_face = 4, V_int = 2', cls: 'c-cobalt' },
        { text: 'Section 4 · Segment Core', cls: 'c-amber' }
      ],
      desc: 'Solid hull exemplar (#18) with 10 extreme vertices, 4 coplanar face points, and 2 strictly interior points forming a 1D interior segment.'
    },
    {
      id: 'v6',
      file: 'magicGem_v6_start+1.stl',
      title: 'magicGem_v6_start+1.stl — Group V Asymmetric-Core Gem',
      sqNum: 33,
      arch: 'solid',
      badges: [
        { text: 'Frénicle #33 · Group V', cls: 'c-emerald' },
        { text: 'V₀ = 10, V_face = 3, V_int = 3', cls: 'c-cobalt' },
        { text: 'Theorem 4.3 · Core Offset', cls: 'c-amber' }
      ],
      desc: 'Group V solid hull (#33) with a 6-point rank-3 inner core (vol(G₁) = 23/4) requiring two-density compensation Δρ₁/ρ₀ ≈ −0.648.'
    },
    {
      id: 'v7',
      file: 'magicGem_v7_start+2.stl',
      title: 'magicGem_v7_start+2.stl — 11-Vertex Group IV Hull',
      sqNum: 25,
      arch: 'solid',
      badges: [
        { text: 'Frénicle #25 · Group IV', cls: 'c-emerald' },
        { text: 'V₀ = 11, V_face = 1, V_int = 4', cls: 'c-cobalt' },
        { text: 'Section 5 · 16-Facet Hull', cls: 'c-amber' }
      ],
      desc: 'High-facet Group IV solid polyhedron (#25, f = (11, 25, 16)) with a 5-point inner core and 13/16 (81.2%) gravitationally stable resting facets.'
    },
    {
      id: 'ring',
      file: 'weighted_ring.stl',
      title: 'weighted_ring.stl — Planar Conical-Fulcrum Balance Wheel',
      sqNum: 175,
      arch: 'radial',
      badges: [
        { text: '1D Magic Ring · N ∈ {4, 5}', cls: 'c-emerald' },
        { text: 'Conical Pivot Cap + Stand', cls: 'c-cobalt' },
        { text: 'Section 2 · Planar Precursor', cls: 'c-amber' }
      ],
      desc: 'Self-balancing 1D radial spoke wheel with perimeter rim, 45° conical pivot cap, and vertical support pedestal from weighted_ring.scad.'
    }
  ];

  var sharedRefRenderer = null;
  var refViewers = [];

  function initSection2ReferenceModels() {
    var grid = document.getElementById('ref-models-grid');
    if (!grid || typeof THREE === 'undefined') return;

    // Create 1 shared offscreen WebGLRenderer for all 8 reference cards -> zero WebGL context loss!
    sharedRefRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    sharedRefRenderer.setSize(420, 290);
    sharedRefRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var stlLoader = new THREE.STLLoader();

    // IntersectionObserver tracks which reference cards are onscreen
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var idx = Number(entry.target.getAttribute('data-ref-idx'));
        if (refViewers[idx]) {
          refViewers[idx].isVisible = entry.isIntersecting;
        }
      });
    }, { threshold: 0.05 });

    REFERENCE_MODELS.forEach(function (item, idx) {
      var card = document.createElement('div');
      card.className = 'ref-card';
      card.setAttribute('data-ref-idx', String(idx));

      var badgesHtml = item.badges.map(function (b) {
        return '<span class="c-pill ' + b.cls + '">' + b.text + '</span>';
      }).join('');

      card.innerHTML =
        '<div class="ref-card-head">' +
          '<div class="ref-badges">' + badgesHtml + '</div>' +
          '<h3>' + item.title + '</h3>' +
          '<p>' + item.desc + '</p>' +
        '</div>' +
        '<div class="ref-viewer-wrap">' +
          '<canvas class="ref-canvas" width="420" height="290"></canvas>' +
          '<div class="ref-loading" id="ref-load-' + idx + '">Loading ' + item.file + '…</div>' +
        '</div>' +
        '<div class="ref-card-foot">' +
          '<div class="ref-tool-btns">' +
            '<button class="mini-btn active" data-act="rot">↻ Auto-Rotate</button>' +
            '<button class="mini-btn" data-act="wire">⊞ Wireframe</button>' +
            '<button class="mini-btn" data-act="reset">🎯 Reset</button>' +
            '<button class="mini-btn" data-act="studio" title="Open this square & architecture in Section 1 Generator">↑ Load in Studio</button>' +
          '</div>' +
          '<a href="' + item.file + '" download="' + item.file + '" class="dl-pill">📥 Download STL</a>' +
        '</div>';

      grid.appendChild(card);
      io.observe(card);

      var canvas2d = card.querySelector('.ref-canvas');
      var ctx2d = canvas2d.getContext('2d');
      var loadEl = card.querySelector('#ref-load-' + idx);

      var scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f2528);

      var camera = new THREE.PerspectiveCamera(38, 420 / 290, 0.1, 1000);
      camera.position.set(0, -3.2, 2.2);
      camera.up.set(0, 0, 1);

      var controls = new THREE.OrbitControls(camera, canvas2d);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.4;

      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      var dLight1 = new THREE.DirectionalLight(0xfffbeb, 0.85);
      dLight1.position.set(5, -6, 8);
      scene.add(dLight1);
      var dLight2 = new THREE.DirectionalLight(0x2dd4bf, 0.45);
      dLight2.position.set(-6, 5, -4);
      scene.add(dLight2);

      var viewerObj = {
        idx: idx,
        item: item,
        canvas2d: canvas2d,
        ctx2d: ctx2d,
        scene: scene,
        camera: camera,
        controls: controls,
        mesh: null,
        isVisible: true
      };
      refViewers.push(viewerObj);

      // Load actual .stl file
      stlLoader.load(
        item.file,
        function (geometry) {
          geometry.computeBoundingBox();
          geometry.center();
          geometry.computeVertexNormals();

          var box = geometry.boundingBox;
          var size = new THREE.Vector3();
          box.getSize(size);
          var maxDim = Math.max(size.x, size.y, size.z) || 1;
          var scaleFactor = 2.15 / maxDim;
          geometry.scale(scaleFactor, scaleFactor, scaleFactor);

          var mat = new THREE.MeshPhysicalMaterial({
            color: idx === 7 ? 0xf59e0b : (idx <= 1 ? 0x2dd4bf : 0x14b8a6),
            roughness: 0.28,
            metalness: 0.15,
            clearcoat: 0.25,
            flatShading: idx >= 2 && idx <= 6
          });
          var mesh = new THREE.Mesh(geometry, mat);
          scene.add(mesh);
          viewerObj.mesh = mesh;
          if (loadEl) loadEl.style.display = 'none';
        },
        undefined,
        function () {
          if (loadEl) loadEl.textContent = 'Preview unavailable (use Download STL)';
        }
      );

      // Toolbar button handlers
      var btnRot = card.querySelector('[data-act="rot"]');
      var btnWire = card.querySelector('[data-act="wire"]');
      var btnReset = card.querySelector('[data-act="reset"]');
      var btnStudio = card.querySelector('[data-act="studio"]');

      btnRot.addEventListener('click', function () {
        controls.autoRotate = !controls.autoRotate;
        btnRot.classList.toggle('active', controls.autoRotate);
      });
      btnWire.addEventListener('click', function () {
        if (!viewerObj.mesh) return;
        viewerObj.mesh.material.wireframe = !viewerObj.mesh.material.wireframe;
        btnWire.classList.toggle('active', viewerObj.mesh.material.wireframe);
      });
      btnReset.addEventListener('click', function () {
        controls.reset();
        camera.position.set(0, -3.2, 2.2);
      });
      btnStudio.addEventListener('click', function () {
        state.sqNum = item.sqNum;
        state.isTwin = false;
        state.archMode = item.arch;
        syncControlsFromState();
        rebuildStudioScene();
        document.getElementById('sec-generator').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // =========================================================================
  // 9. SECTION 3: OPENSCAD CODE STUDIO CONTROLLER
  // =========================================================================

  function initSection3OpenSCAD() {
    // Fetch magicGem.scad and weighted_ring.scad for Tabs 2 & 3
    fetch('magicGem.scad')
      .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
      .then(function (txt) {
        state.scadFiles.magicGem = txt;
        if (state.activeScadTab === 'magicGem') updateOpenSCADDisplay();
      })
      .catch(function () {});

    fetch('weighted_ring.scad')
      .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
      .then(function (txt) {
        state.scadFiles.ring = txt;
        if (state.activeScadTab === 'ring') updateOpenSCADDisplay();
      })
      .catch(function () {});

    var tabs = document.querySelectorAll('#scad-tabs .scad-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        state.activeScadTab = tab.getAttribute('data-scad-tab') || 'custom';
        updateOpenSCADDisplay();
      });
    });

    var btnCopy = document.getElementById('btn-copy-scad');
    if (btnCopy) {
      btnCopy.addEventListener('click', function () {
        var code = getCurrentScadText();
        navigator.clipboard.writeText(code).then(function () {
          btnCopy.textContent = '✓ Copied to Clipboard!';
          setTimeout(function () { btnCopy.textContent = '📋 Copy Code'; }, 1800);
        });
      });
    }

    var btnDl = document.getElementById('btn-download-scad');
    if (btnDl) {
      btnDl.addEventListener('click', function () {
        var code = getCurrentScadText();
        var fname = state.activeScadTab === 'magicGem'
          ? 'magicGem.scad'
          : (state.activeScadTab === 'ring'
            ? 'weighted_ring.scad'
            : ('magicGem_#' + state.sqNum + (state.isTwin ? '_twin' : '') + '.scad'));
        var blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        triggerBlobDownload(blob, fname);
      });
    }
  }

  function getCurrentScadText() {
    if (state.activeScadTab === 'magicGem') return state.scadFiles.magicGem;
    if (state.activeScadTab === 'ring') return state.scadFiles.ring;
    return generateCustomOpenSCAD(state.mech, state.archMode, state.printScaleMm, state.strutMm);
  }

  function updateOpenSCADDisplay() {
    var tabSq = document.getElementById('scad-tab-sqnum');
    if (tabSq) tabSq.textContent = state.sqNum + (state.isTwin ? '*' : '');
    var codeEl = document.getElementById('scad-code-display');
    if (!codeEl || !state.mech) return;
    codeEl.textContent = getCurrentScadText();
    if (window.Prism && Prism.highlightElement) {
      Prism.highlightElement(codeEl);
    }
  }

  // =========================================================================
  // 10. UI EVENT WIRING & ANIMATION LOOP
  // =========================================================================

  function syncControlsFromState() {
    var sqInp = document.getElementById('gen-sq-input');
    if (sqInp) sqInp.value = String(state.sqNum);

    var lamSl = document.getElementById('gen-lam-slider');
    if (lamSl) lamSl.value = String(state.lambda);
    var lamVal = document.getElementById('gen-lam-val');
    if (lamVal) lamVal.textContent = state.lambda.toFixed(4);

    document.querySelectorAll('[data-lam-preset]').forEach(function (b) {
      var v = parseFloat(b.getAttribute('data-lam-preset'));
      b.classList.toggle('active', Math.abs(v - state.lambda) < 0.002);
    });

    var scSl = document.getElementById('gen-scale-slider');
    if (scSl) scSl.value = String(state.printScaleMm);
    var scVal = document.getElementById('gen-scale-val');
    if (scVal) scVal.textContent = state.printScaleMm + ' mm';

    var stSl = document.getElementById('gen-strut-slider');
    if (stSl) stSl.value = String(state.strutMm);
    var stVal = document.getElementById('gen-strut-val');
    if (stVal) stVal.textContent = state.strutMm.toFixed(1) + ' mm';

    var twinBtn = document.getElementById('btn-mirror-twin');
    if (twinBtn) {
      twinBtn.classList.toggle('active', state.isTwin);
      twinBtn.innerHTML = '⇄ Mirror Twin S* = r²S̄: ' + (state.isTwin ? 'ON' : 'OFF');
    }

    document.querySelectorAll('#arch-tabs .arch-tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-arch') === state.archMode);
    });

    document.querySelectorAll('#flagship-presets .preset-btn[data-preset]').forEach(function (btn) {
      var pSq = parseInt(btn.getAttribute('data-preset'), 10);
      var match = (pSq === state.sqNum) || (pSq === 45 && state.sqNum === 54);
      btn.classList.toggle('active', match);
    });

    var btn54 = document.getElementById('btn-sq-54');
    if (btn54) {
      btn54.textContent = state.sqNum === 45 ? '⇄ #54 Cavity Twin' : '⇄ #45 Denser Twin';
      btn54.classList.toggle('active', state.sqNum === 45 || state.sqNum === 54);
    }

    renderModeSubControls();
  }

  function wireStudioControls() {
    // Flagship presets
    document.querySelectorAll('#flagship-presets .preset-btn[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.sqNum = parseInt(btn.getAttribute('data-preset'), 10) || 175;
        state.archMode = btn.getAttribute('data-arch') || 'solid';
        state.lambda = parseFloat(btn.getAttribute('data-lam')) || 0.20;
        syncControlsFromState();
        rebuildStudioScene();
      });
    });

    // Mirror Twin S* toggle
    var twinBtn = document.getElementById('btn-mirror-twin');
    if (twinBtn) {
      twinBtn.addEventListener('click', function () {
        state.isTwin = !state.isTwin;
        syncControlsFromState();
        rebuildStudioScene();
      });
    }

    // 6 Architecture Mode tabs
    document.querySelectorAll('#arch-tabs .arch-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        state.archMode = tab.getAttribute('data-arch') || 'solid';
        syncControlsFromState();
        rebuildStudioScene();
      });
    });

    // Square #1..880 input & buttons
    var sqInp = document.getElementById('gen-sq-input');
    if (sqInp) {
      sqInp.addEventListener('change', function () {
        var v = Math.max(1, Math.min(880, parseInt(sqInp.value, 10) || 1));
        state.sqNum = v;
        syncControlsFromState();
        rebuildStudioScene();
      });
    }
    document.getElementById('btn-sq-prev').addEventListener('click', function () {
      state.sqNum = state.sqNum > 1 ? state.sqNum - 1 : 880;
      syncControlsFromState();
      rebuildStudioScene();
    });
    document.getElementById('btn-sq-next').addEventListener('click', function () {
      state.sqNum = state.sqNum < 880 ? state.sqNum + 1 : 1;
      syncControlsFromState();
      rebuildStudioScene();
    });
    document.getElementById('btn-sq-rand').addEventListener('click', function () {
      state.sqNum = Math.floor(Math.random() * 880) + 1;
      syncControlsFromState();
      rebuildStudioScene();
    });
    document.getElementById('btn-sq-54').addEventListener('click', function () {
      state.sqNum = (state.sqNum === 45) ? 54 : 45;
      state.archMode = 'dual';
      syncControlsFromState();
      rebuildStudioScene();
    });

    // Lift scale lambda slider & preset pills
    var lamSl = document.getElementById('gen-lam-slider');
    if (lamSl) {
      lamSl.addEventListener('input', function () {
        state.lambda = parseFloat(lamSl.value) || 0.20;
        syncControlsFromState();
        rebuildStudioScene();
      });
    }
    document.querySelectorAll('[data-lam-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.lambda = parseFloat(b.getAttribute('data-lam-preset')) || 0.20;
        syncControlsFromState();
        rebuildStudioScene();
      });
    });

    // Print footprint & strut gauge sliders
    var scSl = document.getElementById('gen-scale-slider');
    if (scSl) {
      scSl.addEventListener('input', function () {
        state.printScaleMm = parseFloat(scSl.value) || 60;
        syncControlsFromState();
        rebuildStudioScene();
      });
    }
    var stSl = document.getElementById('gen-strut-slider');
    if (stSl) {
      stSl.addEventListener('input', function () {
        state.strutMm = parseFloat(stSl.value) || 2.4;
        syncControlsFromState();
        rebuildStudioScene();
      });
    }

    // 3D Viewport toolbar buttons
    var btnAutoRot = document.getElementById('btn-gen-autorotate');
    btnAutoRot.addEventListener('click', function () {
      state.autoRotate = !state.autoRotate;
      if (genControls) genControls.autoRotate = state.autoRotate;
      btnAutoRot.classList.toggle('active', state.autoRotate);
    });

    var btnWireOv = document.getElementById('btn-gen-wireoverlay');
    btnWireOv.addEventListener('click', function () {
      state.showWireOverlay = !state.showWireOverlay;
      btnWireOv.classList.toggle('active', state.showWireOverlay);
      rebuildStudioScene();
    });

    var btnAxes = document.getElementById('btn-gen-axes');
    btnAxes.addEventListener('click', function () {
      state.showAxesAndCoM = !state.showAxesAndCoM;
      btnAxes.classList.toggle('active', state.showAxesAndCoM);
      rebuildStudioScene();
    });

    document.getElementById('btn-gen-resetcam').addEventListener('click', function () {
      if (!genControls || !genCamera) return;
      genControls.reset();
      genCamera.position.set(4.6, -4.9, 3.6);
      genCamera.up.set(0, 0, 1);
    });

    // STL / SVG / SCAD Export buttons
    document.getElementById('btn-download-main-stl').addEventListener('click', function () {
      var stlBuf = exportObjectToBinarySTL(genPrintableGroup, state.printScaleMm);
      var fname = 'magicGem_#' + state.sqNum + (state.isTwin ? '_twin' : '') + '_' +
        state.archMode + '_lam' + state.lambda.toFixed(2) + '.stl';
      triggerBlobDownload(new Blob([stlBuf], { type: 'application/octet-stream' }), fname);
    });

    document.getElementById('btn-dl-outer-stl').addEventListener('click', function () {
      var stlBuf = exportObjectToBinarySTL(genOuterOnlyGroup, state.printScaleMm);
      var fname = 'magicGem_#' + state.sqNum + (state.isTwin ? '_twin' : '') + '_outer_G0_lam' + state.lambda.toFixed(2) + '.stl';
      triggerBlobDownload(new Blob([stlBuf], { type: 'application/octet-stream' }), fname);
    });

    document.getElementById('btn-dl-inner-stl').addEventListener('click', function () {
      var stlBuf = exportObjectToBinarySTL(genInnerOnlyGroup, state.printScaleMm);
      var fname = 'magicGem_#' + state.sqNum + (state.isTwin ? '_twin' : '') + '_inner_G1_lam' + state.lambda.toFixed(2) + '.stl';
      triggerBlobDownload(new Blob([stlBuf], { type: 'application/octet-stream' }), fname);
    });

    document.getElementById('btn-dl-svg-net').addEventListener('click', function () {
      if (state.mech) downloadPapercraftSVG(state.mech, state.printScaleMm);
    });

    document.getElementById('btn-dl-custom-scad').addEventListener('click', function () {
      if (!state.mech) return;
      var code = generateCustomOpenSCAD(state.mech, state.archMode, state.printScaleMm, state.strutMm);
      var fname = 'magicGem_#' + state.sqNum + (state.isTwin ? '_twin' : '') + '.scad';
      triggerBlobDownload(new Blob([code], { type: 'text/plain;charset=utf-8' }), fname);
    });
  }

  function animateStudioLoop() {
    requestAnimationFrame(animateStudioLoop);

    // Render Section 1 Generator
    if (genControls && genRenderer && genScene && genCamera) {
      genControls.update();
      genRenderer.render(genScene, genCamera);
    }

    // Render visible Section 2 Reference Cards via the single shared WebGLRenderer
    if (sharedRefRenderer && refViewers.length > 0) {
      for (var i = 0; i < refViewers.length; i++) {
        var rv = refViewers[i];
        if (!rv.isVisible || !rv.mesh) continue;
        rv.controls.update();
        sharedRefRenderer.render(rv.scene, rv.camera);
        rv.ctx2d.clearRect(0, 0, rv.canvas2d.width, rv.canvas2d.height);
        rv.ctx2d.drawImage(sharedRefRenderer.domElement, 0, 0, rv.canvas2d.width, rv.canvas2d.height);
      }
    }
  }

  // Boot Studio on DOMContentLoaded
  function bootStudio() {
    initSection1Generator();
    wireStudioControls();
    syncControlsFromState();
    rebuildStudioScene();
    initSection2ReferenceModels();
    initSection3OpenSCAD();
    animateStudioLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootStudio);
  } else {
    bootStudio();
  }

})();
