drawInit = function() {
    globals.main_screen = document.getElementById("main_screen");
    globals.ctx = main_screen.getContext("2d");
    
    globals.gene_pool_viz_canvas = document.getElementById("gene_pool_viz_bar");
    if (globals.gene_pool_viz_canvas) {
        globals.gene_pool_viz_ctx = globals.gene_pool_viz_canvas.getContext("2d");
    } else {
        console.error("Gene pool visualization canvas not found!");
    }

    resetCamera();
}

resetCamera = function() {
    globals.zoom = config.max_zoom_factor;
    globals.translate_x = 0;
    globals.translate_y = 280;
}

setFps = function(fps) {
    config.draw_fps = fps;
    if(globals.draw_interval)
        clearInterval(globals.draw_interval);
    if(fps > 0 && config.simulation_fps > 0) {
        globals.draw_interval = setInterval(drawFrame, Math.round(1000/config.draw_fps));
    }
}

drawFrame = function() {
    var minmax = getMinMaxDistance();
    globals.target_zoom = Math.min(config.max_zoom_factor, getZoom(minmax.min_x, minmax.max_x + 4, minmax.min_y + 2, minmax.max_y + 2.5));
    globals.zoom += 0.1*(globals.target_zoom - globals.zoom);
    globals.translate_x += 0.1*(1.5-minmax.min_x - globals.translate_x);
    globals.translate_y += 0.3*(minmax.min_y*globals.zoom + 280 - globals.translate_y);

    globals.ctx.clearRect(0, 0, globals.main_screen.width, globals.main_screen.height);
    globals.ctx.save();
    globals.ctx.translate(globals.translate_x*globals.zoom, globals.translate_y);
    globals.ctx.scale(globals.zoom, -globals.zoom);
    drawFloor();
    for(var k = config.population_size - 1; k >= 0 ; k--) {

        if(globals.walkers[k] && !globals.walkers[k].is_eliminated) {
            drawWalker(globals.walkers[k]);
        }
    }
    globals.ctx.restore();
    drawGenePoolVisualization();
}

drawFloor = function() {
    globals.ctx.strokeStyle = "#444";
    globals.ctx.lineWidth = 1/globals.zoom;
    globals.ctx.beginPath();
    var floor_fixture = globals.floor.GetFixtureList();
    globals.ctx.moveTo(floor_fixture.m_shape.m_vertices[0].x, floor_fixture.m_shape.m_vertices[0].y);
    for(var k = 1; k < floor_fixture.m_shape.m_vertices.length; k++) {
        globals.ctx.lineTo(floor_fixture.m_shape.m_vertices[k].x, floor_fixture.m_shape.m_vertices[k].y);
    }
    globals.ctx.stroke();
}

drawWalker = function(walker) {

    var current_torso_x = walker.torso.upper_torso.GetPosition().x;
    var pressure_line_distance = current_torso_x - walker.pressure_line_x_position;
    var normalized_distance = Math.max(0.0, Math.min(1.0, 1.0 / (1.0 + pressure_line_distance)));

    var brightness_factor = 40 + 50 * normalized_distance;
    var saturation_factor = 30 + 40 * normalized_distance;

    globals.ctx.strokeStyle = "hsl(240, 100%, " + brightness_factor.toFixed(0) + "%)";
    globals.ctx.fillStyle = "hsl(240, " + saturation_factor.toFixed(0) + "%, " + (brightness_factor * 0.8).toFixed(0) + "%)";
    globals.ctx.lineWidth = 1/globals.zoom;

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
    globals.ctx.beginPath();
    var fixture = body.GetFixtureList();
    var shape = fixture.GetShape();
    var p0 = body.GetWorldPoint(shape.m_vertices[0]);
    globals.ctx.moveTo(p0.x, p0.y);
    for(var k = 1; k < 4; k++) {
        var p = body.GetWorldPoint(shape.m_vertices[k]);
        globals.ctx.lineTo(p.x, p.y);
    }
    globals.ctx.lineTo(p0.x, p0.y);

    globals.ctx.fill();
    globals.ctx.stroke();
}

drawTest = function() {
    globals.ctx.strokeStyle = "#000";
    globals.ctx.fillStyle = "#666";
    globals.ctx.lineWidth = 1;
    globals.ctx.beginPath();
    globals.ctx.moveTo(0, 0);
    globals.ctx.lineTo(0, 2);
    globals.ctx.lineTo(2, 2);

    globals.ctx.fill();
    globals.ctx.stroke();
}

getMinMaxDistance = function() {
    var min_x = 9999;
    var max_x = -1;
    var min_y = 9999;
    var max_y = -1;
    var activeWalkerFound = false;
    for(var k = 0; k < globals.walkers.length; k++) {
        if(globals.walkers[k] && !globals.walkers[k].is_eliminated) { 
            activeWalkerFound = true;
            var dist = globals.walkers[k].torso.upper_torso.GetPosition();
            min_x = Math.min(min_x, dist.x);
            max_x = Math.max(max_x, dist.x);

            var current_head_y_for_zoom = globals.walkers[k].head.head.GetPosition().y;
            var current_low_foot_y_for_zoom = Math.min(globals.walkers[k].left_leg.foot.GetPosition().y, globals.walkers[k].right_leg.foot.GetPosition().y);

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
    var delta_x = Math.abs(max_x - min_x);
    var delta_y = Math.abs(max_y - min_y);
    if (delta_x === 0) delta_x = 1; 
    if (delta_y === 0) delta_y = 1; 
    var zoom = Math.min(globals.main_screen.width/delta_x,globals.main_screen.height/delta_y);
    return zoom;
}

drawGenePoolVisualization = function() {
    if (!globals.gene_pool_viz_ctx || !globals.genepool) {
        return;
    }

    let ctx = globals.gene_pool_viz_ctx;
    let canvas = globals.gene_pool_viz_canvas;
    let canvasWidth = canvas.width;
    let canvasHeight = canvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    let genepool = globals.genepool;

    if (!genepool || genepool.tiers.length === 0 || genepool.current_record_score <= 0) {
        ctx.fillStyle = "#eee";
        ctx.fillRect(0,0, canvasWidth, canvasHeight);
        ctx.strokeStyle = "#ccc";
        ctx.strokeRect(0,0, canvasWidth, canvasHeight);
        ctx.fillStyle = "#777";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Gene Pool Empty", canvasWidth / 2, canvasHeight / 2 + 4);
        return;
    }
    
    let barStartScore = genepool.start_score;
    let barEndScore = genepool.current_record_score;
    let totalScoreRangeOnBar = barEndScore - barStartScore;

    if (totalScoreRangeOnBar <= 0) { // e.g. base_threshold is 1.0, or record score too low
        ctx.fillStyle = "#ddd"; // Different background if bar is just a point
        ctx.fillRect(0,0, canvasWidth, canvasHeight);
        ctx.strokeStyle = "#aaa";
        ctx.strokeRect(0,0, canvasWidth, canvasHeight);
        ctx.fillStyle = "#555";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Gene Pool Range Too Small", canvasWidth / 2, canvasHeight / 2 + 4);
        return;
    }

    let tierColors = ["#A5D6A7", "#81C784", "#66BB6A", "#4CAF50", "#388E3C"];

    for (var i = 0; i < genepool.tiers.length; i++) {
        let tier = genepool.tiers[i];

        let tierActualStartScore = tier.low_score;
        let tierActualEndScore = tier.high_score;

        // Clip tier drawing to the bar's display range
        let tierDisplayStartScore = Math.max(tierActualStartScore, barStartScore);
        let tierDisplayEndScore = Math.min(tierActualEndScore, barEndScore);

        if (tierDisplayEndScore <= tierDisplayStartScore) continue; // Tier segment is outside or zero width on bar

        let tierStartPosOnBarRel = tierDisplayStartScore - barStartScore;
        let tierEndPosOnBarRel = tierDisplayEndScore - barStartScore;
        
        let tierStartX_px = (tierStartPosOnBarRel / totalScoreRangeOnBar) * canvasWidth;
        let tierEndX_px = (tierEndPosOnBarRel / totalScoreRangeOnBar) * canvasWidth;
        let tierWidth_px = tierEndX_px - tierStartX_px;

        if (tierWidth_px <= 0.1) continue; // Too small to draw

        ctx.fillStyle = tierColors[i % tierColors.length];

        ctx.fillRect(tierStartX_px, 0, tierWidth_px, canvasHeight);
        
        // Draw average score line if applicable
        if (tier.entries.length > 0 && tier.mean_score >= tier.low_score && tier.mean_score <= tier.high_score) {
            let tierScoreRange = tier.high_score - tier.low_score;
            if (tierScoreRange > 0) {
                let avgScorePosInTierRel = (tier.mean_score - tier.low_score) / tierScoreRange;
                var avgLineX_px = tierStartX_px + (avgScorePosInTierRel * tierWidth_px);
                // Make sure avg line is within the drawn segment
                avgLineX_px = Math.max(tierStartX_px, Math.min(avgLineX_px, tierEndX_px -1));
                let avgLineHeight_n = tier.entries.length / genepool.tier_capacity;
                let avgLineHeight_half = Math.max(1, (canvasHeight - 4) * avgLineHeight_n) / 2.0;
                let avgLineStartY_px = (canvasHeight / 2.0) - avgLineHeight_half;
                let avgLineEndY_px = (canvasHeight / 2.0) + avgLineHeight_half;
                ctx.strokeStyle = "rgba(255, 0, 0, 0.7)"; // Semi-transparent red
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(avgLineX_px, avgLineStartY_px); // Small offset from top/bottom
                ctx.lineTo(avgLineX_px, avgLineEndY_px);
                ctx.stroke();
            }
        }
    }

    // Draw overall border for the bar
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
};