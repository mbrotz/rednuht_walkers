
drawInit = function() {
    globals.sim_canvas = document.getElementById("sim_canvas");
    globals.sim_ctx = sim_canvas.getContext("2d");
    globals.mapelites_canvas = document.getElementById("mapelites_canvas");
    globals.mapelites_ctx = globals.mapelites_canvas.getContext("2d");
    globals.genepool_canvas = document.getElementById("genepool_canvas");
    globals.genepool_ctx = globals.genepool_canvas.getContext("2d");
    resetCamera();
}

resetCamera = function() {
    globals.zoom = config.max_zoom_factor;
    globals.translate_x = 0;
    globals.translate_y = 280;
}

drawFrame = function() {
    let minmax = getMinMaxDistance();
    globals.target_zoom = Math.min(config.max_zoom_factor, getZoom(minmax.min_x, minmax.max_x + 4, minmax.min_y + 2, minmax.max_y + 2.5));
    globals.zoom += 0.1*(globals.target_zoom - globals.zoom);
    globals.translate_x += 0.1*(1.5-minmax.min_x - globals.translate_x);
    globals.translate_y += 0.3*(minmax.min_y*globals.zoom + 280 - globals.translate_y);

    globals.sim_ctx.clearRect(0, 0, globals.sim_canvas.width, globals.sim_canvas.height);
    globals.sim_ctx.save();
    globals.sim_ctx.translate(globals.translate_x*globals.zoom, globals.translate_y);
    globals.sim_ctx.scale(globals.zoom, -globals.zoom);
    drawFloor();
    for (let k = globals.population.walkers.length - 1; k >= 0 ; k--) {
        let walker = globals.population.walkers[k];
        if (walker && !walker.is_eliminated) {
            drawWalker(walker);
        }
    }
    globals.sim_ctx.restore();
    drawDistanceIndicator();
    drawMapElites();
    drawGenePool();
}

drawDistanceIndicator = function() {
    let ctx = globals.sim_ctx;
    let canvasWidth = globals.sim_canvas.width;
    let canvasHeight = globals.sim_canvas.height;

    // --- Define indicator visual parameters ---
    let indicatorYPosition = canvasHeight - 25; // Y position of the baseline of the ruler
    let majorTickHeight = 8;
    let minorTickHeight = 4;
    let textColor = "#666";
    let lineColor = "#777";
    let labelOffsetY = 12; // Vertical offset for labels from the baseline

    ctx.save(); // Save current context state

    // --- 1. Determine Visible World X-Range ---
    // Note: globals.translate_x is the screen offset for world origin X=0.
    // globals.zoom is pixels per world unit.
    let canvasLeftWorldX = -globals.translate_x / globals.zoom;
    let canvasRightWorldX = (canvasWidth - globals.translate_x) / globals.zoom;
    let visibleWorldWidth = canvasRightWorldX - canvasLeftWorldX;

    if (visibleWorldWidth <= 0) { // Should not happen if zoom is positive
        ctx.restore();
        return;
    }

    // --- 2. Choose an Appropriate Major Tick Interval ---
    let desiredMajorTicksOnScreen = Math.max(3, Math.min(10, canvasWidth / 75)); // Aim for 3-10 major ticks, or one every ~75px
    let roughMajorInterval = visibleWorldWidth / desiredMajorTicksOnScreen;
    
    let majorTickWorldDistance;
    if (roughMajorInterval === 0) { // Avoid log(0)
        majorTickWorldDistance = 1;
    } else {
        let exponent = Math.floor(Math.log10(roughMajorInterval));
        let powerOf10 = Math.pow(10, exponent);
        let normalizedInterval = roughMajorInterval / powerOf10;

        if (normalizedInterval < 1.5)      majorTickWorldDistance = 1 * powerOf10;
        else if (normalizedInterval < 3.5) majorTickWorldDistance = 2 * powerOf10;
        else if (normalizedInterval < 7.5) majorTickWorldDistance = 5 * powerOf10;
        else                               majorTickWorldDistance = 10 * powerOf10;
    }
    
    // Sanity check for very small/large intervals
    if (majorTickWorldDistance <= 0) majorTickWorldDistance = 1; // Fallback
    // Prevent extremely small intervals if super zoomed in and visibleWorldWidth is tiny
    let minSensibleInterval = 0.001; // Example: don't show ticks for 0.0001
    if (majorTickWorldDistance < minSensibleInterval && visibleWorldWidth < minSensibleInterval * desiredMajorTicksOnScreen) {
        majorTickWorldDistance = minSensibleInterval;
    }

    // --- 3. Calculate Minor Tick Interval ---
    let numMinorSubdivisions = 5; // e.g., 4 minor ticks create 5 segments between major ticks
    let minorTickWorldDistance = majorTickWorldDistance / numMinorSubdivisions;

    // --- Draw baseline (Optional - can be useful for alignment) ---
     ctx.beginPath();
     ctx.moveTo(0, indicatorYPosition);
     ctx.lineTo(canvasWidth, indicatorYPosition);
     ctx.strokeStyle = lineColor;
     ctx.lineWidth = 0.5;
     ctx.stroke();

    // --- 4. & 5. Iterate and Draw Ticks ---
    ctx.strokeStyle = lineColor;
    ctx.fillStyle = textColor;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 1;

    // Determine starting points for iteration to cover the visible range
    let firstMajorTickWorldX = Math.ceil(canvasLeftWorldX / majorTickWorldDistance) * majorTickWorldDistance;
    let firstMinorTickWorldX = Math.ceil(canvasLeftWorldX / minorTickWorldDistance) * minorTickWorldDistance;

    // Draw Major Ticks and Labels
    for (let worldX = firstMajorTickWorldX; worldX <= canvasRightWorldX + majorTickWorldDistance; worldX += majorTickWorldDistance) {
        let screenX = Math.round(worldX * globals.zoom + globals.translate_x); 
        
        // Only draw if tick is reasonably within canvas bounds
        if (screenX < -majorTickHeight || screenX > canvasWidth + majorTickHeight) continue;

        ctx.beginPath();
        ctx.moveTo(screenX, indicatorYPosition);
        ctx.lineTo(screenX, indicatorYPosition - majorTickHeight);
        ctx.stroke();

        let precision = 0;
        if (majorTickWorldDistance < 0.1) precision = 3;
        else if (majorTickWorldDistance < 1) precision = 2;
        else if (majorTickWorldDistance < 10) precision = 1;
        
        // Avoid label collision by checking screen distance (simple check)
        // More sophisticated label management is complex, this is a basic approach.
        // We'll draw all for now, the dynamic interval should help.
        ctx.fillText(worldX.toFixed(Math.max(0, precision - 1)), screenX, indicatorYPosition + labelOffsetY);
    }

    // Draw Minor Ticks
    for (let worldX = firstMinorTickWorldX; worldX <= canvasRightWorldX + minorTickWorldDistance; worldX += minorTickWorldDistance) {
        // Avoid drawing a minor tick if it's (practically) at the same location as a major tick
        // Check with a small epsilon due to floating point arithmetic
        let isMajorTickLocation = false;
        if (majorTickWorldDistance > 0) { // Avoid division by zero if majorTickWorldDistance somehow became 0
             const remainder = worldX % majorTickWorldDistance;
             const epsilon = minorTickWorldDistance * 0.01; // A small fraction of minor tick distance
             if (Math.abs(remainder) < epsilon || Math.abs(remainder - majorTickWorldDistance) < epsilon) {
                 isMajorTickLocation = true;
             }
        }


        if (isMajorTickLocation) {
            continue;
        }
        
        let screenX = Math.round(worldX * globals.zoom + globals.translate_x);
        if (screenX < -minorTickHeight || screenX > canvasWidth + minorTickHeight) continue;

        ctx.beginPath();
        ctx.moveTo(screenX, indicatorYPosition);
        ctx.lineTo(screenX, indicatorYPosition - minorTickHeight);
        ctx.stroke();
    }
    ctx.restore(); // Restore context state
}

drawFloor = function() {
    globals.sim_ctx.strokeStyle = "#444";
    globals.sim_ctx.lineWidth = 1/globals.zoom;
    globals.sim_ctx.beginPath();
    let floor_fixture = globals.floor.GetFixtureList();
    globals.sim_ctx.moveTo(floor_fixture.m_shape.m_vertices[0].x, floor_fixture.m_shape.m_vertices[0].y);
    for (let k = 1; k < floor_fixture.m_shape.m_vertices.length; k++) {
        globals.sim_ctx.lineTo(floor_fixture.m_shape.m_vertices[k].x, floor_fixture.m_shape.m_vertices[k].y);
    }
    globals.sim_ctx.stroke();
}

drawWalker = function(walker) {
    let pressure_line_distance = walker.getPressureLineDistance();
    let normalized_distance = Math.max(0.0, Math.min(1.0, 1.0 / (1.0 + pressure_line_distance)));
    let brightness_factor = 40 + 50 * normalized_distance;
    let saturation_factor = 30 + 40 * normalized_distance;
    globals.sim_ctx.strokeStyle = "hsl(240, 100%, " + brightness_factor.toFixed(0) + "%)";
    globals.sim_ctx.fillStyle = "hsl(240, " + saturation_factor.toFixed(0) + "%, " + (brightness_factor * 0.8).toFixed(0) + "%)";
    globals.sim_ctx.lineWidth = 1/globals.zoom;
    drawRect(walker.left_arm.lower_arm);
    drawRect(walker.left_arm.upper_arm);
    drawRect(walker.left_leg.foot);
    drawRect(walker.left_leg.lower_leg);
    drawRect(walker.left_leg.upper_leg);
    drawRect(walker.head.neck);
    drawRect(walker.head.head);
    drawRect(walker.torso.lower_torso);
    drawRect(walker.torso.upper_torso);
    drawRect(walker.right_leg.upper_leg);
    drawRect(walker.right_leg.lower_leg);
    drawRect(walker.right_leg.foot);
    drawRect(walker.right_arm.upper_arm);
    drawRect(walker.right_arm.lower_arm);
}

drawRect = function(body) {
    globals.sim_ctx.beginPath();
    let fixture = body.GetFixtureList();
    let shape = fixture.GetShape();
    let p0 = body.GetWorldPoint(shape.m_vertices[0]);
    globals.sim_ctx.moveTo(p0.x, p0.y);
    for (let k = 1; k < 4; k++) {
        let p = body.GetWorldPoint(shape.m_vertices[k]);
        globals.sim_ctx.lineTo(p.x, p.y);
    }
    globals.sim_ctx.lineTo(p0.x, p0.y);
    globals.sim_ctx.fill();
    globals.sim_ctx.stroke();
}

getMinMaxDistance = function() {
    let min_x = 9999;
    let max_x = -1;
    let min_y = 9999;
    let max_y = -1;
    let activeWalkerFound = false;
    for (let k = 0; k < globals.population.walkers.length; k++) {
        let walker = globals.population.walkers[k];
        if (walker && !walker.is_eliminated) {
            activeWalkerFound = true;
            let dist = walker.torso.upper_torso.GetPosition();
            min_x = Math.min(min_x, dist.x);
            max_x = Math.max(max_x, dist.x);
            let current_head_y_for_zoom = walker.head.head.GetPosition().y;
            let current_low_foot_y_for_zoom = Math.min(walker.left_leg.foot.GetPosition().y, walker.right_leg.foot.GetPosition().y);
            min_y = Math.min(min_y, current_low_foot_y_for_zoom, current_head_y_for_zoom);
            max_y = Math.max(max_y, dist.y, current_head_y_for_zoom);
        }
    }
    if (!activeWalkerFound) {
        min_x = 0; max_x = 1; min_y = 0; max_y = 1;
    }
    return {min_x:min_x, max_x:max_x, min_y:min_y, max_y:max_y};
}

getZoom = function(min_x, max_x, min_y, max_y) {
    let delta_x = Math.abs(max_x - min_x);
    let delta_y = Math.abs(max_y - min_y);
    if (delta_x === 0) delta_x = 1;
    if (delta_y === 0) delta_y = 1;
    let zoom = Math.min(globals.sim_canvas.width/delta_x,globals.sim_canvas.height/delta_y);
    return zoom;
}

drawMapElites = function() {
    if (!globals.mapelites_ctx || !globals.mapelites) {
        return;
    }
    let context = globals.mapelites_ctx;
    let canvas = globals.mapelites_canvas;
    let canvasWidth = canvas.width;
    let canvasHeight = canvas.height;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    
    const bins = globals.mapelites.bins;
    if (!bins || bins.length === 0) {
        context.fillStyle = "#eee";
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        context.strokeStyle = "#ccc";
        context.strokeRect(0, 0, canvasWidth, canvasHeight);
        context.fillStyle = "#777";
        context.font = "10px sans-serif";
        context.textAlign = "center";
        context.fillText("MAP-Elites Archive Empty", canvasWidth / 2, canvasHeight / 2 + 4);
        return;
    }

    let maxRecordScoreOverall = 0;

    // Find the maximum record score across all bins for normalization
    for (let i = 0; i < bins.length; i++) {
        if (bins[i] && bins[i].genepool && bins[i].genepool.history) {
            maxRecordScoreOverall = Math.max(maxRecordScoreOverall, bins[i].genepool.history.record_score);
        }
    }

    // Draw each bin
    for (let i = 0; i < bins.length; i++) {
        const bin = bins[i];
        const binWidth = canvasWidth * bin.range;
        const x_position = canvasWidth * bin.low;
        let normalized_score = 0;

        if (bin && bin.genepool && bin.genepool.history) {
            const current_bin_score = bin.genepool.history.record_score;
            if (maxRecordScoreOverall > 0) {
                normalized_score = current_bin_score / maxRecordScoreOverall;
            }
        }
        
        normalized_score = Math.max(0, Math.min(1, normalized_score)); // Clamp between 0 and 1

        // Color: White for low score (0), Black for high score (1)
        const gray_value = Math.floor(255 * (1 - normalized_score)); 
        context.fillStyle = "rgb(" + gray_value + "," + gray_value + "," + gray_value + ")";
        context.fillRect(x_position, 0, binWidth, canvasHeight);

        // Draw a light border for each bin
        context.strokeStyle = "#bbb"; 
        context.lineWidth = 0.5;
        context.strokeRect(x_position, 0, binWidth, canvasHeight);
    }

    // Draw highlight for the selected bin
    if (globals.selectedMapElitesBin !== undefined && globals.selectedMapElitesBin !== -1) {
        const selectedIdx = globals.selectedMapElitesBin;
        if (selectedIdx >= 0 && selectedIdx < bins.length) {
            const bin = bins[selectedIdx];
            const binWidth = canvasWidth * bin.range;
            const selected_x = canvasWidth * bin.low;
            context.strokeStyle = "red"; 
            context.lineWidth = 2; 
            // Adjust to draw the border inside the bin area
            context.strokeRect(selected_x + context.lineWidth / 2, 
                               context.lineWidth / 2, 
                               binWidth - context.lineWidth, 
                               canvasHeight - context.lineWidth);
        }
    }
}

drawGenePool = function() {
    if (!globals.genepool_ctx || !globals.genepool) {
        let context = globals.genepool_ctx;
        let canvas = globals.genepool_canvas;
        let canvasWidth = canvas.width;
        let canvasHeight = canvas.height;
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.fillStyle = "#eee";
        context.fillRect(0,0, canvasWidth, canvasHeight);
        context.strokeStyle = "#ccc";
        context.strokeRect(0,0, canvasWidth, canvasHeight);
        context.fillStyle = "#777";
        context.font = "10px sans-serif";
        context.textAlign = "center";
        context.fillText("No MAP-Elites Bin Selected", canvasWidth / 2, canvasHeight / 2 + 4);
        return;
    }
    let context = globals.genepool_ctx;
    let canvas = globals.genepool_canvas;
    let canvasWidth = canvas.width;
    let canvasHeight = canvas.height;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    let genepool = globals.genepool;
    if (genepool.tiers.length === 0 || genepool.history.record_score <= 0) {
        context.fillStyle = "#eee";
        context.fillRect(0,0, canvasWidth, canvasHeight);
        context.strokeStyle = "#ccc";
        context.strokeRect(0,0, canvasWidth, canvasHeight);
        context.fillStyle = "#777";
        context.font = "10px sans-serif";
        context.textAlign = "center";
        context.fillText("Gene Pool Empty", canvasWidth / 2, canvasHeight / 2 + 4);
        return;
    }
    let barStartScore = genepool.start_score;
    let barEndScore = genepool.history.record_score;
    let totalScoreRangeOnBar = barEndScore - barStartScore;
    if (totalScoreRangeOnBar <= 0) {
        context.fillStyle = "#ddd";
        context.fillRect(0,0, canvasWidth, canvasHeight);
        context.strokeStyle = "#aaa";
        context.strokeRect(0,0, canvasWidth, canvasHeight);
        context.fillStyle = "#555";
        context.font = "10px sans-serif";
        context.textAlign = "center";
        context.fillText("Gene Pool Range Too Small", canvasWidth / 2, canvasHeight / 2 + 4);
        return;
    }
    let tierColors = ["#A5D6A7", "#81C784", "#66BB6A", "#4CAF50", "#388E3C"];
    for (let i = 0; i < genepool.tiers.length; i++) {
        let tier = genepool.tiers[i];
        let tierActualStartScore = tier.low_score;
        let tierActualEndScore = tier.high_score;
        let tierDisplayStartScore = Math.max(tierActualStartScore, barStartScore);
        let tierDisplayEndScore = Math.min(tierActualEndScore, barEndScore);
        if (tierDisplayEndScore <= tierDisplayStartScore) continue;
        let tierStartPosOnBarRel = tierDisplayStartScore - barStartScore;
        let tierEndPosOnBarRel = tierDisplayEndScore - barStartScore;
        let tierStartX_px = (tierStartPosOnBarRel / totalScoreRangeOnBar) * canvasWidth;
        let tierEndX_px = (tierEndPosOnBarRel / totalScoreRangeOnBar) * canvasWidth;
        let tierWidth_px = tierEndX_px - tierStartX_px;
        if (tierWidth_px <= 0.1) continue;
        context.fillStyle = tierColors[i % tierColors.length];
        context.fillRect(tierStartX_px, 0, tierWidth_px + 2, canvasHeight);
        if (tier.entries.length > 0 && tier.mean_score >= tier.low_score && tier.mean_score <= tier.high_score) {
            let tierScoreRange = tier.high_score - tier.low_score;
            if (tierScoreRange > 0) {
                let avgScorePosInTierRel = (tier.mean_score - tier.low_score) / tierScoreRange;
                let avgLineX_px = tierStartX_px + (avgScorePosInTierRel * tierWidth_px);
                avgLineX_px = Math.max(tierStartX_px, Math.min(avgLineX_px, tierEndX_px -1));
                let avgLineHeight_n = tier.entries.length / genepool.tier_capacity;
                let avgLineHeight_half = Math.max(1, (canvasHeight - 4) * avgLineHeight_n) / 2.0;
                let avgLineStartY_px = (canvasHeight / 2.0) - avgLineHeight_half;
                let avgLineEndY_px = (canvasHeight / 2.0) + avgLineHeight_half;
                context.strokeStyle = "rgba(255, 0, 0, 0.7)";
                context.lineWidth = 2;
                context.beginPath();
                context.moveTo(avgLineX_px, avgLineStartY_px);
                context.lineTo(avgLineX_px, avgLineEndY_px);
                context.stroke();
            }
        }
    }
};