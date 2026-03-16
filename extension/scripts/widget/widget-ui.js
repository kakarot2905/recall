(() => {
    function getAnimationSpeed(widgetId) {
        const widget = document.getElementById(widgetId);
        return parseFloat(widget?.style.getPropertyValue("--recall-anim-speed") || "1") || 1;
    }

    function createOptionButton(widgetId, text, isCorrect, isSelected, onClickCallback, isDisabled = false) {
        const speed = getAnimationSpeed(widgetId);
        const btn = document.createElement("button");
        btn.textContent = text;
        btn.style.display = "block";
        btn.style.width = "100%";
        btn.style.padding = "8px";
        btn.style.marginBottom = "6px";
        btn.style.border = "1px solid #ddd";
        btn.style.borderRadius = "6px";
        btn.style.background = "#f5f5f5";
        btn.style.color = "#333";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "12px";
        btn.style.transition = `all ${0.3 * speed}s`;
        btn.style.fontFamily = "inherit";

        if (isSelected) {
            btn.style.border = "1px solid " + (isCorrect ? "#4CAF50" : "#f44336");
            btn.style.background = isCorrect ? "#E8F5E9" : "#FFEBEE";
            btn.style.color = isCorrect ? "#2E7D32" : "#C62828";
            btn.style.fontWeight = "bold";
            btn.disabled = true;
        } else if (isDisabled) {
            btn.style.opacity = "0.45";
            btn.style.cursor = "not-allowed";
            btn.disabled = true;
        } else {
            btn.onmouseover = () => {
                btn.style.background = "#efefef";
                btn.style.border = "1px solid #999";
            };
            btn.onmouseout = () => {
                btn.style.background = "#f5f5f5";
                btn.style.border = "1px solid #ddd";
            };
            btn.onclick = onClickCallback;
        }

        return btn;
    }

    function createInputButton(widgetId, text, variant = "primary") {
        const speed = getAnimationSpeed(widgetId);
        const btn = document.createElement("button");
        btn.textContent = text;
        btn.style.padding = "6px 12px";
        btn.style.margin = "4px";
        btn.style.border = "1px solid #ddd";
        btn.style.borderRadius = "4px";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "12px";
        btn.style.fontFamily = "inherit";
        btn.style.transition = `all ${0.2 * speed}s`;

        if (variant === "primary") {
            btn.style.background = "#2196F3";
            btn.style.color = "white";
            btn.style.border = "1px solid #2196F3";
        } else if (variant === "secondary") {
            btn.style.background = "#f5f5f5";
            btn.style.color = "#333";
            btn.style.border = "1px solid #ddd";
        }

        btn.onmouseover = () => {
            btn.style.opacity = "0.8";
        };
        btn.onmouseout = () => {
            btn.style.opacity = "1";
        };

        return btn;
    }

    window.RecallWidgetUi = {
        createOptionButton,
        createInputButton,
    };
})();
