
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
    drawMapElites();
    drawGenePool();
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
    
    
}

drawGenePool = function() {
    if (!globals.genepool_ctx || !globals.genepool) {
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