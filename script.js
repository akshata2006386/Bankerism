
/* =====================================
   BANKERSIM - BANKER'S ALGORITHM
===================================== */

"use strict";

let lastReport = null;

const $ = (id) => document.getElementById(id);

const processCountInput = $("processCount");
const resourceCountInput = $("resourceCount");
const matrixMode = $("matrixMode");
const resourceMode = $("resourceMode");

/* -------------------------------------
   UPDATE INPUT LABELS
------------------------------------- */

function updateLabels() {

    const isMaximum = matrixMode.value === "maximum";
    const isAvailable = resourceMode.value === "available";

    $("secondTableTitle").textContent =
        isMaximum ? "Maximum Matrix" : "Need Matrix";

    $("secondTableDescription").textContent =
        isMaximum
            ? "Maximum resources required by each process."
            : "Remaining resources required by each process.";

    $("matrixDescription").textContent =
        isMaximum
            ? "Need = Maximum − Allocation"
            : "Maximum = Allocation + Need";

    $("resourceTableTitle").textContent =
        isAvailable ? "Available Resources" : "Total Resources";

    $("resourceTableDescription").textContent =
        isAvailable
            ? "Currently available instances of each resource."
            : "Total instances of each resource in the system.";

    $("resourceDescription").textContent =
        isAvailable
            ? "Work starts with Available resources."
            : "Available = Total − Allocated resources.";

    clearResults();
}

/* -------------------------------------
   VALIDATE DIMENSIONS
------------------------------------- */

function getDimensions() {

    const processes = Number(processCountInput.value);
    const resources = Number(resourceCountInput.value);

    if (
        !Number.isInteger(processes) ||
        processes < 1 ||
        processes > 10
    ) {
        throw new Error("Enter between 1 and 10 processes.");
    }

    if (
        !Number.isInteger(resources) ||
        resources < 1 ||
        resources > 5
    ) {
        throw new Error("Enter between 1 and 5 resource types.");
    }

    return { processes, resources };
}

/* -------------------------------------
   CREATE MATRIX TABLE
------------------------------------- */

function createMatrixTable(containerId, rows, columns, prefix) {

    let html = "<table><thead><tr><th>Process</th>";

    for (let j = 0; j < columns; j++) {
        html += `<th>R${j}</th>`;
    }

    html += "</tr></thead><tbody>";

    for (let i = 0; i < rows; i++) {

        html += `<tr><td class="process-label">P${i}</td>`;

        for (let j = 0; j < columns; j++) {

            html += `
                <td>
                    <input
                        class="matrix-input"
                        type="number"
                        min="0"
                        step="1"
                        value="0"
                        id="${prefix}_${i}_${j}"
                        aria-label="${prefix} Process ${i} Resource ${j}"
                    >
                </td>
            `;
        }

        html += "</tr>";
    }

    html += "</tbody></table>";

    $(containerId).innerHTML = html;
}

/* -------------------------------------
   CREATE RESOURCE TABLE
------------------------------------- */

function createResourceTable(columns) {

    let html = "<table><thead><tr>";

    for (let j = 0; j < columns; j++) {
        html += `<th>R${j}</th>`;
    }

    html += "</tr></thead><tbody><tr>";

    for (let j = 0; j < columns; j++) {

        html += `
            <td>
                <input
                    class="matrix-input"
                    type="number"
                    min="0"
                    step="1"
                    value="0"
                    id="resource_${j}"
                    aria-label="Resource ${j}"
                >
            </td>
        `;
    }

    html += "</tr></tbody></table>";

    $("resourceTable").innerHTML = html;
}

/* -------------------------------------
   GENERATE ALL TABLES
------------------------------------- */

function generateTables() {

    try {

        const { processes, resources } = getDimensions();

        createMatrixTable(
            "allocationTable",
            processes,
            resources,
            "allocation"
        );

        createMatrixTable(
            "secondTable",
            processes,
            resources,
            "second"
        );

        createResourceTable(resources);

        clearResults();
        hideError();

    } catch (error) {

        showError(error.message);
    }
}

/* -------------------------------------
   READ MATRIX VALUES
------------------------------------- */

function readMatrix(prefix, rows, columns) {

    const matrix = [];

    for (let i = 0; i < rows; i++) {

        const row = [];

        for (let j = 0; j < columns; j++) {

            const input = $(`${prefix}_${i}_${j}`);

            if (!input) {
                throw new Error("Please generate the input tables first.");
            }

            const value = input.value.trim();
            const number = Number(value);

            if (
                value === "" ||
                !Number.isSafeInteger(number) ||
                number < 0
            ) {
                throw new Error(
                    `Enter a valid non-negative integer in ${prefix}, P${i}, R${j}.`
                );
            }

            row.push(number);
        }

        matrix.push(row);
    }

    return matrix;
}

/* -------------------------------------
   READ RESOURCE VECTOR
------------------------------------- */

function readResources(columns) {

    const resources = [];

    for (let j = 0; j < columns; j++) {

        const input = $(`resource_${j}`);

        if (!input) {
            throw new Error("Please generate the input tables first.");
        }

        const value = input.value.trim();
        const number = Number(value);

        if (
            value === "" ||
            !Number.isSafeInteger(number) ||
            number < 0
        ) {
            throw new Error(
                `Enter a valid non-negative integer for R${j}.`
            );
        }

        resources.push(number);
    }

    return resources;
}

/* -------------------------------------
   CALCULATE MAXIMUM AND NEED
------------------------------------- */

function calculateMatrices(allocation, second) {

    const need = [];
    const maximum = [];

    for (let i = 0; i < allocation.length; i++) {

        const needRow = [];
        const maximumRow = [];

        for (let j = 0; j < allocation[i].length; j++) {

            if (matrixMode.value === "maximum") {

                if (second[i][j] < allocation[i][j]) {
                    throw new Error(
                        `Maximum cannot be less than Allocation at P${i}, R${j}.`
                    );
                }

                maximumRow.push(second[i][j]);
                needRow.push(second[i][j] - allocation[i][j]);

            } else {

                const maxValue = allocation[i][j] + second[i][j];

                maximumRow.push(maxValue);
                needRow.push(second[i][j]);
            }
        }

        maximum.push(maximumRow);
        need.push(needRow);
    }

    return { maximum, need };
}

/* -------------------------------------
   CALCULATE AVAILABLE RESOURCES
------------------------------------- */

function calculateAvailable(allocation, resourceValues) {

    if (resourceMode.value === "available") {
        return resourceValues;
    }

    const totalAllocated = allocation[0].map((_, j) => {

        return allocation.reduce(
            (sum, row) => sum + row[j],
            0
        );
    });

    const available = [];

    for (let j = 0; j < resourceValues.length; j++) {

        if (resourceValues[j] < totalAllocated[j]) {
            throw new Error(
                `Total resources for R${j} cannot be less than allocated resources.`
            );
        }

        available.push(resourceValues[j] - totalAllocated[j]);
    }

    return available;
}

/* -------------------------------------
   BANKER'S SAFETY ALGORITHM
------------------------------------- */

function runBankersAlgorithm(allocation, need, available) {

    const processCount = allocation.length;

    const work = [...available];

    const finish = Array(processCount).fill(false);

    const safeSequence = [];

    const execution = [];

    let progress = true;

    while (safeSequence.length < processCount && progress) {

        progress = false;

        for (let i = 0; i < processCount; i++) {

            if (finish[i]) {
                continue;
            }

            const canExecute = need[i].every(
                (required, j) => required <= work[j]
            );

            if (canExecute) {

                const workBefore = [...work];

                // Release allocated resources after completion.
                for (let j = 0; j < work.length; j++) {
                    work[j] += allocation[i][j];
                }

                finish[i] = true;

                safeSequence.push(i);

                execution.push({
                    process: i,
                    need: [...need[i]],
                    allocation: [...allocation[i]],
                    workBefore,
                    workAfter: [...work],
                    finish: [...finish]
                });

                progress = true;
            }
        }
    }

    return {
        safe: finish.every(Boolean),
        finish,
        work,
        safeSequence,
        execution
    };
}

/* -------------------------------------
   DISPLAY MATRIX
------------------------------------- */

function displayMatrix(containerId, matrix) {

    let html = "<table><thead><tr><th>Process</th>";

    for (let j = 0; j < matrix[0].length; j++) {
        html += `<th>R${j}</th>`;
    }

    html += "</tr></thead><tbody>";

    matrix.forEach((row, i) => {

        html += `<tr><td class="process-label">P${i}</td>`;

        row.forEach(value => {
            html += `<td>${value}</td>`;
        });

        html += "</tr>";
    });

    html += "</tbody></table>";

    $(containerId).innerHTML = html;
}

/* -------------------------------------
   DISPLAY AVAILABLE RESOURCES
------------------------------------- */

function displayAvailable(available) {

    $("availableResult").innerHTML = available.map(
        (value, j) => `
            <span class="resource-chip">R${j}: ${value}</span>
        `
    ).join("");
}

/* -------------------------------------
   DISPLAY SAFE SEQUENCE
------------------------------------- */

function displaySequence(result) {

    const container = $("sequenceResult");

    if (result.safe) {

        let html = "";

        result.safeSequence.forEach((process, index) => {

            if (index > 0) {
                html += `<span class="sequence-arrow">→</span>`;
            }

            html += `<span class="sequence-node">P${process}</span>`;
        });

        container.innerHTML = html;

    } else {

        const completed = result.safeSequence
            .map(p => `P${p}`)
            .join(" → ");

        const remaining = result.finish
            .map((done, i) => done ? null : `P${i}`)
            .filter(Boolean)
            .join(", ");

        container.innerHTML = `
            <div>
                <p class="empty-result">
                    Processes completed before the algorithm got stuck:
                </p>
                <p>${completed || "None"}</p>
                <br>
                <span class="unsafe-node">
                    Cannot complete: ${remaining}
                </span>
            </div>
        `;
    }
}

/* -------------------------------------
   DISPLAY EXECUTION TABLE
------------------------------------- */

function displayExecution(execution, resourceCount) {

    if (execution.length === 0) {
        $("executionTable").innerHTML =
            '<p class="empty-result">No process could execute.</p>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Step</th>
                    <th>Process</th>
                    <th>Work Before</th>
                    <th>Allocation</th>
                    <th>Work After</th>
                    <th>Finish</th>
                </tr>
            </thead>
            <tbody>
    `;

    execution.forEach((item, index) => {

        html += `
            <tr>
                <td>${index + 1}</td>
                <td class="process-label">P${item.process}</td>
                <td>${item.workBefore.join(", ")}</td>
                <td>${item.allocation.join(", ")}</td>
                <td>${item.workAfter.join(", ")}</td>
                <td>True</td>
            </tr>
        `;
    });

    html += "</tbody></table>";

    $("executionTable").innerHTML = html;
}

/* -------------------------------------
   CALCULATE SIMULATION
------------------------------------- */

function calculateBanker() {

    hideError();

    try {

        const { processes, resources } = getDimensions();

        const allocation = readMatrix(
            "allocation",
            processes,
            resources
        );

        const second = readMatrix(
            "second",
            processes,
            resources
        );

        const resourceValues = readResources(resources);

        const { maximum, need } = calculateMatrices(
            allocation,
            second
        );

        const available = calculateAvailable(
            allocation,
            resourceValues
        );

        const result = runBankersAlgorithm(
            allocation,
            need,
            available
        );

        displayMatrix("needTable", need);

        displayAvailable(available);

        displaySequence(result);

        displayExecution(result.execution, resources);

        $("totalProcesses").textContent = processes;

        $("completedCount").textContent =
            result.safeSequence.length;

        $("stateValue").textContent =
            result.safe ? "SAFE" : "UNSAFE";

        $("statusText").textContent =
            result.safe
                ? "System is in a SAFE state."
                : "System is in an UNSAFE state.";

        $("systemStatus").className =
            result.safe
                ? "result-status safe"
                : "result-status unsafe";

        lastReport = {
            allocation,
            maximum,
            need,
            available,
            result
        };

        $("results").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        showError(error.message);
    }
}

/* -------------------------------------
   LOAD STANDARD EXAMPLE
------------------------------------- */

function loadExample() {

    processCountInput.value = 5;
    resourceCountInput.value = 3;

    matrixMode.value = "maximum";
    resourceMode.value = "available";

    updateLabels();
    generateTables();

    const allocation = [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2]
    ];

    const maximum = [
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3]
    ];

    const available = [3, 3, 2];

    allocation.forEach((row, i) => {

        row.forEach((value, j) => {
            $(`allocation_${i}_${j}`).value = value;
        });
    });

    maximum.forEach((row, i) => {

        row.forEach((value, j) => {
            $(`second_${i}_${j}`).value = value;
        });
    });

    available.forEach((value, j) => {
        $(`resource_${j}`).value = value;
    });

    hideError();

    calculateBanker();
}

/* -------------------------------------
   CLEAR RESULTS
------------------------------------- */

function clearResults() {

    lastReport = null;

    $("totalProcesses").textContent = "0";
    $("completedCount").textContent = "0";
    $("stateValue").textContent = "—";

    $("statusText").textContent = "Waiting for simulation";

    $("systemStatus").className = "result-status";

    $("needTable").innerHTML =
        '<p class="empty-result">Results will appear here.</p>';

    $("availableResult").textContent = "—";

    $("sequenceResult").innerHTML =
        '<p class="empty-result">Run the simulation to see the sequence.</p>';

    $("executionTable").innerHTML =
        '<p class="empty-result">Execution details will appear here.</p>';
}

/* -------------------------------------
   RESET
------------------------------------- */

function resetSimulator() {

    processCountInput.value = 5;
    resourceCountInput.value = 3;

    matrixMode.value = "maximum";
    resourceMode.value = "available";

    updateLabels();
    generateTables();

    hideError();
}


  // ERROR MESSAGE //
function showError(message) {

    const errorBox = $("errorMessage");

    errorBox.textContent = "⚠ " + message;

    errorBox.classList.add("show");
}

function hideError() {

    $("errorMessage").textContent = "";

    $("errorMessage").classList.remove("show");
}

/* -------------------------------------
   DOWNLOAD REPORT
------------------------------------- */

function downloadReport() {

    if (!lastReport) {
        showError("Please calculate the simulation before downloading.");
        return;
    }

    const data = lastReport;

    const lines = [];

    lines.push("BANKERSIM - SIMULATION REPORT");
    lines.push("================================");
    lines.push("");

    lines.push("ALLOCATION MATRIX");
    lines.push(JSON.stringify(data.allocation));

    lines.push("");
    lines.push("MAXIMUM MATRIX");
    lines.push(JSON.stringify(data.maximum));

    lines.push("");
    lines.push("NEED MATRIX");
    lines.push(JSON.stringify(data.need));

    lines.push("");
    lines.push("AVAILABLE RESOURCES");
    lines.push(JSON.stringify(data.available));

    lines.push("");
    lines.push("SYSTEM STATE");
    lines.push(data.result.safe ? "SAFE" : "UNSAFE");

    lines.push("");
    lines.push("SAFE SEQUENCE / COMPLETED ORDER");
    lines.push(
        data.result.safeSequence
            .map(p => `P${p}`)
            .join(" -> ") || "None"
    );

    lines.push("");
    lines.push("EXECUTION DETAILS");

    data.result.execution.forEach((item, index) => {

        lines.push(`Step ${index + 1}: P${item.process}`);

        lines.push(`Work Before: ${item.workBefore.join(", ")}`);

        lines.push(`Allocation: ${item.allocation.join(", ")}`);

        lines.push(`Work After: ${item.workAfter.join(", ")}`);

        lines.push("Finish: " + item.finish[item.process]);
        lines.push("");
    });

    const blob = new Blob(
        [lines.join("\n")],
        { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "BankerSim-Report.txt";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}

/* -------------------------------------
   EVENT LISTENERS
------------------------------------- */

$("generateBtn").addEventListener("click", generateTables);

$("exampleBtn").addEventListener("click", loadExample);

$("calculateBtn").addEventListener("click", calculateBanker);

$("resetBtn").addEventListener("click", resetSimulator);

$("downloadBtn").addEventListener("click", downloadReport);

matrixMode.addEventListener("change", updateLabels);

resourceMode.addEventListener("change", updateLabels);

/* -------------------------------------
   INITIALIZE WEBSITE
------------------------------------- */

updateLabels();
generateTables();
