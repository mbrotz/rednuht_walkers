
let Camera = function() {
    this.__constructor.apply(this, arguments);
}

Camera.prototype.__constructor = function(cameraConfig) {
    this.start_x = cameraConfig.camera_start_x;
    this.start_y = cameraConfig.camera_start_y;
    this.max_zoom_factor = cameraConfig.camera_max_zoom_factor;
    this.reset();
}

Camera.prototype._calculateMinMax = function(walkers) {
    let min_x = 9999;
    let max_x = -9999;
    let min_y = 9999;
    let max_y = -9999;
    let activeWalkerFound = false;
    for (let k = 0; k < walkers.length; k++) {
        let walker = walkers[k];
        if (walker && walker.body && !walker.is_eliminated) {
            let body = walker.body;
            activeWalkerFound = true;
            let dist = body.torso.upperTorso.GetPosition();
            min_x = Math.min(min_x, dist.x);
            max_x = Math.max(max_x, dist.x);
            let current_head_y_for_zoom = body.head.head.GetPosition().y;
            let current_low_foot_y_for_zoom = Math.min(body.left_leg.foot.GetPosition().y, body.right_leg.foot.GetPosition().y);
            min_y = Math.min(min_y, current_low_foot_y_for_zoom, current_head_y_for_zoom);
            max_y = Math.max(max_y, dist.y, current_head_y_for_zoom);
        }
    }
    if (activeWalkerFound) {
        return {min_x: min_x, max_x: max_x, min_y: min_y, max_y: max_y};
    }
    return {min_x: 0, max_x: 1, min_y: 0, max_y: 1};
}

Camera.prototype._calculateZoom = function(width, height, min_x, max_x, min_y, max_y) {
    let delta_x = Math.abs(max_x - min_x);
    let delta_y = Math.abs(max_y - min_y);
    if (delta_x === 0) delta_x = 1;
    if (delta_y === 0) delta_y = 1;
    return Math.min(width / delta_x, height / delta_y);
}

Camera.prototype._calculateTargetZoom = function(canvas, minmax) {
    let zoom = this._calculateZoom(canvas.width, canvas.height, minmax.min_x, minmax.max_x + 4, minmax.min_y + 2, minmax.max_y + 2.5);
    return Math.max(1.0, Math.min(this.max_zoom_factor, zoom));
}

Camera.prototype.worldToScreenX = function(world_x) {
    return (this.translate_x + world_x) * this.zoom;
}

Camera.prototype.worldToScreenY = function(world_y) {
    return this.translate_y - (world_y * this.zoom);
}

Camera.prototype.screenToWorldX = function(screen_x) {
    if (this.zoom <= 0) return screen_x;
    return (screen_x / this.zoom) - this.translate_x;
}

Camera.prototype.screenToWorldY = function(screen_y) {
    if (this.zoom <= 0) return screen_y;
    return (this.translate_y - screen_y) / this.zoom;
}

Camera.prototype.worldToScreenWidth = function(world_width) {
    return world_width * this.zoom;
}

Camera.prototype.worldToScreenHeight = function(world_height) {
    return world_height * this.zoom;
}

Camera.prototype.screenToWorldWidth = function(screen_width) {
    if (this.zoom === 0) return screen_width;
    return screen_width / this.zoom;
}

Camera.prototype.screenToWorldHeight = function(screen_height) {
    if (this.zoom === 0) return screen_height;
    return screen_height / this.zoom;
}

Camera.prototype.reset = function() {
    this.zoom = this.max_zoom_factor;
    this.target_zoom = this.max_zoom_factor;
    this.translate_x = this.start_x;
    this.translate_y = this.start_y;
}

Camera.prototype.update = function(canvas, walkers) {
    let minmax = this._calculateMinMax(walkers);
    this.target_zoom = this._calculateTargetZoom(canvas, minmax);
    this.zoom += 0.1 * (this.target_zoom - this.zoom);
    this.translate_x += 0.1 * (1.5 - minmax.min_x - this.translate_x);
    this.translate_y += 0.3 * (minmax.min_y * this.zoom + this.start_y - this.translate_y);
}

Camera.prototype.apply = function(context) {
    context.translate(this.translate_x * this.zoom, this.translate_y);
    context.scale(this.zoom, -this.zoom);
}

let Renderer = function() {
    this.__constructor.apply(this, arguments);
}

Renderer.prototype.__constructor = function(gameInstance) {
    this.game = gameInstance;

    this.camera_start_x = this.game.config.camera_start_x;
    this.camera_start_y = this.game.config.camera_start_y;
    this.camera_max_zoom_factor = this.game.config.camera_max_zoom_factor;
    this.walkers_origin_x = this.game.config.walkers_origin_x;

    this.simCanvas = this.game.interface.simCanvasEl;
    this.simContext = this.simCanvas.getContext("2d");
    this.mapelitesCanvas = this.game.interface.mapelitesCanvasEl;
    this.mapelitesContext = this.mapelitesCanvas.getContext("2d");
    this.genepoolCanvas = this.game.interface.genepoolCanvasEl;
    this.genepoolContext = this.genepoolCanvas.getContext("2d");

    this.camera = new Camera({
        camera_start_x: this.camera_start_x,
        camera_start_y: this.camera_start_y,
        camera_max_zoom_factor: this.camera_max_zoom_factor
    });
}

Renderer.prototype.drawFrame = function() {
    this._drawActualFrame(this.game.floor, this.game.population.walkers);
}

Renderer.prototype._drawActualFrame = function(floor, walkers) {
    this.simContext.clearRect(0, 0, this.simCanvas.width, this.simCanvas.height);
    this.simContext.save();

    this.camera.update(this.simCanvas, walkers);
    this.camera.apply(this.simContext);

    this._drawFloor(floor);
    this._drawWalkersOriginIndicator(this.walkers_origin_x, floor);
    this._drawWalkers(walkers);
    this._drawRuler(floor);

    this.simContext.restore();

    this._drawMapElites();
    this._drawGenePool();
}

Renderer.prototype._drawFloor = function(floor) {
    const ctx = this.simContext;
    ctx.strokeStyle = "#444";
    ctx.lineWidth = this.camera.screenToWorldWidth(1);
    ctx.beginPath();
    let floor_fixture = floor.GetFixtureList();
    ctx.moveTo(floor_fixture.m_shape.m_vertices[0].x, floor_fixture.m_shape.m_vertices[0].y);
    for (let k = 1; k < floor_fixture.m_shape.m_vertices.length; k++) {
        ctx.lineTo(floor_fixture.m_shape.m_vertices[k].x, floor_fixture.m_shape.m_vertices[k].y);
    }
    ctx.stroke();
}

Renderer.prototype._drawBodyPart = function(body) {
    const ctx = this.simContext;
    ctx.beginPath();
    let fixture = body.GetFixtureList();
    let shape = fixture.GetShape();
    let p0 = body.GetWorldPoint(shape.m_vertices[0]);
    ctx.moveTo(p0.x, p0.y);
    for (let k = 1; k < 4; k++) {
        let p = body.GetWorldPoint(shape.m_vertices[k]);
        ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(p0.x, p0.y);
    ctx.fill();
    ctx.stroke();
}

Renderer.prototype._drawWalker = function(walker) {
    const ctx = this.simContext;
    let pressure_line_distance = walker.getPressureLineDistance();
    let normalized_distance = Math.max(0.0, Math.min(1.0, 1.0 / (1.0 + pressure_line_distance)));
    let brightness_factor = 40 + 50 * normalized_distance;
    let saturation_factor = 30 + 40 * normalized_distance;
    ctx.strokeStyle = "hsl(240, 100%, " + brightness_factor.toFixed(0) + "%)";
    ctx.fillStyle = "hsl(240, " + saturation_factor.toFixed(0) + "%, " + (brightness_factor * 0.8).toFixed(0) + "%)";
    ctx.lineWidth = this.camera.screenToWorldWidth(1);
    for (let i = 0; i < walker.body.bodies.length; i++) {
        this._drawBodyPart(walker.body.bodies[i]);
    }
}

Renderer.prototype._drawWalkers = function(walkers) {
    for (let k = walkers.length - 1; k >= 0 ; k--) {
        let walker = walkers[k];
        if (walker && !walker.is_eliminated) {
            this._drawWalker(walker);
        }
    }
}

Renderer.prototype._drawWalkersOriginIndicator = function(walkers_origin_x, floor) {
    const ctx = this.simContext;
    let floor_y = floor.GetFixtureList().m_shape.m_vertices[0].y;
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(walkers_origin_x, floor_y);
    ctx.lineTo(walkers_origin_x, floor_y - 0.1);
    ctx.stroke();
}

Renderer.prototype._drawRuler = function(floor) {
    const ctx = this.simContext;
    const canvas = this.simCanvas;
    const camera = this.camera;
    const walkers_origin_x = this.walkers_origin_x;

    const RULER_MAIN_COLOR = "#666";
    const RULER_FADED_COLOR = "#AAA";
    const RULER_BASELINE_LINE_WIDTH_SCREEN = 1;
    const RULER_TICK_LINE_WIDTH_SCREEN = 1;

    const RULER_VERTICAL_PADDING_SCREEN = 5;
    const MIN_RULER_AREA_HEIGHT_SCREEN = 30;

    const MAJOR_TICK_HEIGHT_SCREEN = 8;
    const MINOR_TICK_HEIGHT_SCREEN = 4;
    const FONT_SIZE_SCREEN = 10;

    const LABEL_OFFSET_FROM_BASELINE_SCREEN = 10;

    let floor_y_world = floor.GetFixtureList().m_shape.m_vertices[0].y;
    let floor_y_screen = camera.worldToScreenY(floor_y_world);

    let ruler_area_top_screen = floor_y_screen + RULER_VERTICAL_PADDING_SCREEN;
    let ruler_area_bottom_screen = canvas.height - RULER_VERTICAL_PADDING_SCREEN;

    if (ruler_area_bottom_screen - ruler_area_top_screen < MIN_RULER_AREA_HEIGHT_SCREEN) {
        ruler_area_bottom_screen = canvas.height - RULER_VERTICAL_PADDING_SCREEN;
        ruler_area_top_screen = ruler_area_bottom_screen - MIN_RULER_AREA_HEIGHT_SCREEN;
        if (ruler_area_top_screen < floor_y_screen + RULER_VERTICAL_PADDING_SCREEN) {
             ruler_area_top_screen = floor_y_screen + RULER_VERTICAL_PADDING_SCREEN;
             if (ruler_area_bottom_screen <= ruler_area_top_screen) return;
        }
    }

    let ruler_content_height_screen = MAJOR_TICK_HEIGHT_SCREEN + LABEL_OFFSET_FROM_BASELINE_SCREEN + FONT_SIZE_SCREEN;
    let ruler_center_y_screen = ruler_area_top_screen + (ruler_area_bottom_screen - ruler_area_top_screen) / 2;
    let ruler_baseline_y_screen = ruler_center_y_screen + (ruler_content_height_screen / 2) - FONT_SIZE_SCREEN - LABEL_OFFSET_FROM_BASELINE_SCREEN;
    let ruler_baseline_world_y = camera.screenToWorldY(ruler_baseline_y_screen);
    let major_tick_height_world = camera.screenToWorldHeight(MAJOR_TICK_HEIGHT_SCREEN);
    let minor_tick_height_world = camera.screenToWorldHeight(MINOR_TICK_HEIGHT_SCREEN);
    let label_text_y_screen = ruler_baseline_y_screen + LABEL_OFFSET_FROM_BASELINE_SCREEN;
    let label_text_y_world = camera.screenToWorldY(label_text_y_screen);

    const screen_edge_buffer_px = 20;
    let world_left_edge = camera.screenToWorldX(0 - screen_edge_buffer_px);
    let world_right_edge = camera.screenToWorldX(canvas.width + screen_edge_buffer_px);
    let visible_world_width = world_right_edge - world_left_edge;

    if (visible_world_width <= 0 || camera.zoom <= 0) {
        return;
    }

    let desired_major_ticks_on_screen = Math.max(3, Math.min(10, canvas.width / 80));
    let rough_major_interval_world = visible_world_width / desired_major_ticks_on_screen;
    let major_tick_world_distance;

    if (rough_major_interval_world <= 1e-9) {
        major_tick_world_distance = 1;
    } else {
        let exponent = Math.floor(Math.log10(rough_major_interval_world));
        let powerOf10 = Math.pow(10, exponent);
        let normalizedInterval = rough_major_interval_world / powerOf10;

        if (normalizedInterval < 1.5)      major_tick_world_distance = 1 * powerOf10;
        else if (normalizedInterval < 3.5) major_tick_world_distance = 2 * powerOf10;
        else if (normalizedInterval < 7.5) major_tick_world_distance = 5 * powerOf10;
        else                               major_tick_world_distance = 10 * powerOf10;
    }

    const min_sensible_world_interval = 1e-4;
    if (major_tick_world_distance < min_sensible_world_interval) {
        major_tick_world_distance = min_sensible_world_interval;
    }
    if (major_tick_world_distance <= 1e-9) major_tick_world_distance = 0.1;

    const num_minor_subdivisions = 5;
    let minor_tick_world_distance = major_tick_world_distance / num_minor_subdivisions;
    const epsilon = minor_tick_world_distance * 0.01;

    const baseline_line_width_world = camera.screenToWorldWidth(RULER_BASELINE_LINE_WIDTH_SCREEN);
    const tick_line_width_world = camera.screenToWorldWidth(RULER_TICK_LINE_WIDTH_SCREEN);
    const font_size_world = camera.screenToWorldHeight(FONT_SIZE_SCREEN);

    ctx.font = font_size_world + "px sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = RULER_MAIN_COLOR;
    ctx.lineWidth = baseline_line_width_world;
    ctx.beginPath();
    ctx.moveTo(camera.screenToWorldX(0), ruler_baseline_world_y);
    ctx.lineTo(camera.screenToWorldX(canvas.width), ruler_baseline_world_y);
    ctx.stroke();

    let first_tick_offset_world = Math.floor((world_left_edge - walkers_origin_x) / minor_tick_world_distance) * minor_tick_world_distance;

    for (let offset = first_tick_offset_world; ; offset += minor_tick_world_distance) {
        let current_tick_world_x = walkers_origin_x + offset;
        if (current_tick_world_x > world_right_edge) {
            break;
        }
        if (current_tick_world_x < world_left_edge && Math.abs(offset) > major_tick_world_distance*2) {
             if (offset > 0 && walkers_origin_x + offset + major_tick_world_distance < world_left_edge) {
                offset = Math.ceil((world_left_edge - walkers_origin_x) / minor_tick_world_distance -1) * minor_tick_world_distance ;
                continue;
            }
        }

        const is_major_tick = Math.abs(offset % major_tick_world_distance) < epsilon || Math.abs(offset % major_tick_world_distance - major_tick_world_distance) < epsilon || Math.abs(offset % major_tick_world_distance + major_tick_world_distance) < epsilon;
        const is_zero_tick_label = Math.abs(offset) < epsilon;
        let tick_height_world = is_major_tick ? major_tick_height_world : minor_tick_height_world;
        const color = (offset < -epsilon && !is_zero_tick_label) ? RULER_FADED_COLOR : RULER_MAIN_COLOR;

        ctx.strokeStyle = color;
        ctx.lineWidth = tick_line_width_world;
        ctx.beginPath();
        ctx.moveTo(current_tick_world_x, ruler_baseline_world_y);
        ctx.lineTo(current_tick_world_x, ruler_baseline_world_y + tick_height_world);
        ctx.stroke();

        if (is_major_tick) {
            ctx.fillStyle = color;
            let labelText;
            if (is_zero_tick_label) {
                labelText = "0";
            } else {
                let precision = 0;
                const absOffset = Math.abs(offset);
                if (major_tick_world_distance < 0.015 || (absOffset > epsilon && absOffset < 0.015)) precision = 3;
                else if (major_tick_world_distance < 0.15 || (absOffset > epsilon && absOffset < 0.15)) precision = 2;
                else if (major_tick_world_distance < 1.5 || (absOffset > epsilon && absOffset < 1.5)) precision = 1;
                else if (major_tick_world_distance < 15 || (absOffset > epsilon && absOffset < 15)) precision = 0;
                labelText = offset.toFixed(precision);
            }
            ctx.save();
            ctx.translate(current_tick_world_x, label_text_y_world);
            ctx.scale(1, -1);
            ctx.fillText(labelText, 0, 0);
            ctx.restore();
        }
    }
};

Renderer.prototype._drawMapElites = function() {
    if (!this.mapelitesContext || !this.game.mapelites || !this.game.interface) {
        return;
    }
    let context = this.mapelitesContext;
    let canvas = this.mapelitesCanvas;
    let canvasWidth = canvas.width;
    let canvasHeight = canvas.height;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    const bins = this.game.mapelites.bins;
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
    const range = this.game.mapelites.range;
    if (range <= 0) {
        context.fillStyle = "#ddd";
        context.fillRect(0,0, canvasWidth, canvasHeight);
        context.strokeStyle = "#aaa";
        context.strokeRect(0,0, canvasWidth, canvasHeight);
        context.fillStyle = "#555";
        context.font = "10px sans-serif";
        context.textAlign = "center";
        context.fillText("Map Elites Range Too Small", canvasWidth / 2, canvasHeight / 2 + 4);
        return;
    }
    let maxRecordScoreOverall = 0;
    for (let i = 0; i < bins.length; i++) {
        if (bins[i] && bins[i].genepool && bins[i].genepool.history) {
            maxRecordScoreOverall = Math.max(maxRecordScoreOverall, bins[i].genepool.history.record_score);
        }
    }
    const threshold = this.game.mapelites.threshold;
    for (let i = 0; i < bins.length; i++) {
        const bin = bins[i];
        const x_start = canvasWidth * (bin.low - threshold);
        const x_end = canvasWidth * (bin.high - threshold);
        const binWidth = x_end - x_start;
        let normalized_score = 0;
        if (bin && bin.genepool && bin.genepool.history) {
            const current_bin_score = bin.genepool.history.record_score;
            if (maxRecordScoreOverall > 0) {
                normalized_score = current_bin_score / maxRecordScoreOverall;
            }
        }
        normalized_score = Math.max(0, Math.min(1, normalized_score));
        const gray_value = Math.floor(255 * (1 - normalized_score));
        context.fillStyle = "rgb(" + gray_value + "," + gray_value + "," + gray_value + ")";
        context.fillRect(x_start, 0, binWidth, canvasHeight);
        context.strokeStyle = "#bbb";
        context.lineWidth = 0.5;
        context.strokeRect(x_start, 0, binWidth, canvasHeight);
        if (!bin.enabled) {
            context.strokeStyle = "red";
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(x_start, 0);
            context.lineTo(x_end, canvasHeight);
            context.moveTo(x_end, 0);
            context.lineTo(x_start, canvasHeight);
            context.stroke();
        }
    }

    if (this.game.interface.selectedMapElitesBin > -1 && this.game.interface.selectedMapElitesBin < bins.length) {
        const bin = bins[this.game.interface.selectedMapElitesBin];
        if (bin) {
            const x_start = canvasWidth * (bin.low - threshold);
            const x_end = canvasWidth * (bin.high - threshold);
            const binWidth = x_end - x_start;
            context.strokeStyle = "red";
            context.lineWidth = 2;
            context.strokeRect(x_start + 1, 1, binWidth - 2, canvasHeight - 2);
        }
    }
}

Renderer.prototype._drawGenePool = function() {
    let genepool = this.game.interface ? this.game.interface.currentSelectedGenePool : null;

    if (!this.genepoolContext) {
        return;
    }
    let context = this.genepoolContext;
    let canvas = this.genepoolCanvas;
    let canvasWidth = canvas.width;
    let canvasHeight = canvas.height;
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    if (!genepool) {
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
