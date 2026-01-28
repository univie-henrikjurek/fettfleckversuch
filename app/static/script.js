document.addEventListener("DOMContentLoaded", function () {
    // dark mode functionality
    // this did not work on every device, i am unsure why.  
    const toggleSwitch = document.getElementById("theme-toggle");
    if (toggleSwitch) {
        const body = document.body;

        // restore dark mode state from localStorage
        if (localStorage.getItem("dark-mode") === "enabled") {
            body.classList.add("dark-mode");
            toggleSwitch.checked = true;
        }

        // handle dark mode toggle changes
        toggleSwitch.addEventListener("change", function () {
            if (toggleSwitch.checked) {
                body.classList.add("dark-mode");
                localStorage.setItem("dark-mode", "enabled");
            } else {
                body.classList.remove("dark-mode");
                localStorage.setItem("dark-mode", "disabled");
            }
        });
    }

    // brightness analysis elements
    const uploadedImage = document.getElementById('uploaded-image');
    const overlay = document.getElementById('overlay');
    const resetBtn = document.getElementById('reset-btn');
    const resultsInf1 = document.getElementById('inf1');
    const resultsHuman1 = document.getElementById('human1');
    const resultsInf2 = document.getElementById('inf2');
    const resultsHuman2 = document.getElementById('human2');
    const resultsDiffInf = document.getElementById('diffInf');
    const resultsDiffHuman = document.getElementById('diffHuman');

    // stores the selected points on the image
    let points = [];

    if (uploadedImage) {
        // set canvas size based on the displayed image size once the image is loaded
        uploadedImage.addEventListener('load', function () {
            overlay.width = uploadedImage.clientWidth;
            overlay.height = uploadedImage.clientHeight;
            overlay.style.width = uploadedImage.clientWidth + 'px';
            overlay.style.height = uploadedImage.clientHeight + 'px';
        });

        // handle click events on the canvas to place points
        overlay.addEventListener('click', function (e) {
            const rect = overlay.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (points.length < 2) {
                points.push({ x: x, y: y });
                drawPoint(x, y, points.length); // use different colors for each point

                // trigger brightness calculation once two points are selected
                if (points.length === 2) {
                    getBrightness(points);
                }
            }
        });
    }

    // draws a point on the canvas with a color depending on the point index
    function drawPoint(x, y, pointNumber) {
        const ctx = overlay.getContext('2d');
        ctx.fillStyle = pointNumber === 1 ? 'red' : 'green'; // red for point 1, green for point 2
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }

    // Clears the canvas (used when resetting the selection)
    function clearCanvas() {
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, overlay.width, overlay.height);
    }

    // sends selected points to the backend and retrieves brightness values
    function getBrightness(points) {
        fetch('/get_brightness', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ points: points })
        })
            .then(response => response.json())
            .then(data => {
                if (data.results && data.results.length === 2) {
                    const result1 = data.results[0];
                    const result2 = data.results[1];

                    // display results for point 1 and point 2 (computational brightness)
                    resultsInf1.innerHTML = `<span style="color: red;">Point 1</span>: ${result1.informatik_brightness.toFixed(2)}`;
                    resultsInf2.innerHTML = `<span style="color: green;">Point 2</span>: ${result2.informatik_brightness.toFixed(2)}`;

                    // display results for point 1 and point 2 (human-perceived brightness)
                    resultsHuman1.innerHTML = `<span style="color: red;">Point 1</span>: ${result1.human_brightness.toFixed(2)}`;
                    resultsHuman2.innerHTML = `<span style="color: green;">Point 2</span>: ${result2.human_brightness.toFixed(2)}`;

                    // calculate brightness differences
                    const diffInf = (result1.informatik_brightness - result2.informatik_brightness).toFixed(2);
                    const diffHuman = (result1.human_brightness - result2.human_brightness).toFixed(2);

                    // display brightness difference results
                    resultsDiffInf.innerHTML =
                        `Computational brightness: <span style="color: red;">Point 1</span> is ${diffInf} units brighter than <span style="color: green;">Point 2</span>`;
                    resultsDiffHuman.innerHTML =
                        `Perceived brightness: <span style="color: red;">Point 1</span> is ${diffHuman} units brighter than <span style="color: green;">Point 2</span>`;
                } else {
                    console.error('Unexpected response format:', data);
                }
            })
            .catch(error => console.error('Error:', error));
    }

    if (resetBtn) {
        // reset selected points, canvas, and displayed results
        resetBtn.addEventListener('click', function () {
            points = [];
            clearCanvas();
            resultsInf1.textContent = '-';
            resultsHuman1.textContent = '-';
            resultsInf2.textContent = '-';
            resultsHuman2.textContent = '-';
            resultsDiffInf.textContent = '';
            resultsDiffHuman.textContent = '';
        });
    }
});
