const pulseGrid = document.getElementById("pulseGrid");
const trustSpark = document.getElementById("trustSpark");
const timeScrubber = document.getElementById("timeScrubber");
const timeLabel = document.getElementById("timeLabel");
const trustScore = document.getElementById("trustScore");
const slaRange = document.getElementById("slaRange");
const slaValue = document.getElementById("slaValue");
const slaViolations = document.getElementById("slaViolations");
const incidentList = document.getElementById("incidentList");
const heroStreams = document.getElementById("heroStreams");
const heroSla = document.getElementById("heroSla");
const heroResolution = document.getElementById("heroResolution");
const topologyEdges = document.getElementById("topologyEdges");
const topologyNodes = document.getElementById("topologyNodes");
const personaSummary = document.getElementById("personaSummary");
const personaFocus = document.getElementById("personaFocus");
const personaActions = document.getElementById("personaActions");
const personaTabs = Array.from(document.querySelectorAll(".persona-tab"));
const contractDrawer = document.getElementById("contractDrawer");
const drawerTitle = document.getElementById("drawerTitle");
const drawerSubtitle = document.getElementById("drawerSubtitle");
const drawerMetrics = document.getElementById("drawerMetrics");
const drawerSchema = document.getElementById("drawerSchema");
const drawerLineage = document.getElementById("drawerLineage");
const drawerActions = document.getElementById("drawerActions");
const drawerClose = document.getElementById("drawerClose");

let meshData = null;
let incidentNodes = new Map();
let lastFocusedElement = null;

function seedPulseGrid() {
  const dots = 30;
  pulseGrid.innerHTML = "";
  for (let i = 0; i < dots; i += 1) {
    const dot = document.createElement("div");
    dot.className = "pulse-dot";
    dot.style.animationDelay = `${(i % 6) * 0.4}s`;
    pulseGrid.appendChild(dot);
  }
}

function seedSparkline(values) {
  trustSpark.innerHTML = "";
  trustSpark.style.display = "flex";
  values.forEach((value, index) => {
    const bar = document.createElement("div");
    bar.style.flex = "1";
    bar.style.marginRight = index === values.length - 1 ? "0" : "4px";
    bar.style.borderRadius = "6px";
    bar.style.background = "linear-gradient(180deg, rgba(75,217,199,0.7), rgba(90,125,255,0.2))";
    bar.style.height = `${10 + (value / 100) * 30}px`;
    trustSpark.appendChild(bar);
  });
}

function setTimelineState(index) {
  if (!meshData) return;
  const state = meshData.trustTimeline[index];
  if (!state) return;
  timeLabel.textContent = state.label;
  timeScrubber.setAttribute("aria-valuetext", state.label);
  trustScore.textContent = state.trust;
  incidentNodes.forEach((node, id) => {
    if ((state.incidents || []).includes(id)) {
      node.style.borderColor = "rgba(255, 77, 77, 0.4)";
      node.style.boxShadow = "0 0 12px rgba(255, 77, 77, 0.2)";
    } else {
      node.style.borderColor = "rgba(255, 255, 255, 0.05)";
      node.style.boxShadow = "none";
    }
  });
}

function updateSlaModel(value) {
  const sla = Number(value);
  slaValue.textContent = `${sla}s`;
  const violations = Math.max(0.6, 10 - sla) * 0.55;
  slaViolations.textContent = `${violations.toFixed(1)}%`;
}

function renderIncidents(incidents) {
  incidentList.innerHTML = "";
  incidentNodes = new Map();
  incidents.forEach((incident) => {
    const card = document.createElement("div");
    card.className = "incident";
    card.dataset.severity = incident.severity;
    card.innerHTML = `
      <div class="incident-title">${incident.title}</div>
      <div class="incident-meta">${incident.stream}</div>
    `;
    incidentList.appendChild(card);
    incidentNodes.set(incident.id, card);
  });
}

function renderTopology(topology) {
  topologyEdges.innerHTML = "";
  topologyNodes.innerHTML = "";
  const nodeMap = new Map();
  topology.nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", node.r);
    if (node.contractId) {
      circle.dataset.contractId = node.contractId;
      circle.classList.add("node-interactive");
      circle.setAttribute("role", "button");
      circle.setAttribute("tabindex", "0");
      circle.setAttribute(
        "aria-label",
        node.label ? `${node.label} contract details` : "Contract details"
      );
    }
    if (node.status === "warning") {
      circle.classList.add("node-warning");
    }
    if (node.status === "critical") {
      circle.classList.add("node-critical");
    }
    topologyNodes.appendChild(circle);
  });

  topology.edges.forEach((edge) => {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    if (edge.status === "warning") {
      line.classList.add("edge-warning");
    }
    if (edge.status === "critical") {
      line.classList.add("edge-critical");
    }
    topologyEdges.appendChild(line);
  });
}

function openDrawer(contract) {
  if (!contract) return;
  lastFocusedElement = document.activeElement;
  drawerTitle.textContent = contract.title;
  drawerSubtitle.textContent = contract.subtitle;
  drawerMetrics.innerHTML = `
    <span>Status: ${contract.status}</span>
    <span>Latency: ${contract.latency}</span>
    <span>Quality: ${contract.quality}</span>
    <span>Owner: ${contract.owner}</span>
  `;
  drawerSchema.textContent = contract.schema;
  drawerLineage.innerHTML = contract.lineage.map((item) => `<li>${item}</li>`).join("");
  drawerActions.innerHTML = contract.actions
    .map((item) => `<span class="action-pill">${item}</span>`)
    .join("");
  contractDrawer.classList.add("is-open");
  contractDrawer.setAttribute("aria-hidden", "false");
  drawerClose.focus();
}

function closeDrawer() {
  contractDrawer.classList.remove("is-open");
  contractDrawer.setAttribute("aria-hidden", "true");
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

function handleNodeActivate(target) {
  if (!target || !target.dataset.contractId || !meshData) return;
  const contract = meshData.contracts.find((item) => item.id === target.dataset.contractId);
  openDrawer(contract);
}

function setActivePersonaTab(tab) {
  personaTabs.forEach((item) => {
    const isActive = item === tab;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-selected", isActive ? "true" : "false");
    item.setAttribute("tabindex", isActive ? "0" : "-1");
  });
}

function renderPersonas(personas, key) {
  const persona = personas[key];
  if (!persona) return;
  personaSummary.innerHTML = `
    <h3>${persona.title}</h3>
    <p>${persona.summary}</p>
  `;
  personaFocus.innerHTML = `
    <div class="panel-title">Focus areas</div>
    <ul class="persona-list">${persona.focus.map((item) => `<li>${item}</li>`).join("")}</ul>
  `;
  personaActions.innerHTML = `
    <div class="panel-title">Primary actions</div>
    ${persona.actions.map((item) => `<span class="action-pill">${item}</span>`).join("")}
  `;
}

function applyHeroMetrics(hero) {
  heroStreams.textContent = hero.streams;
  heroSla.textContent = hero.sla;
  heroResolution.textContent = hero.resolution;
}

function bootWithData(data) {
  meshData = data;
  applyHeroMetrics(data.hero);
  renderIncidents(data.incidents);
  renderTopology(data.topology);
  seedSparkline(data.trustSpark);
  renderPersonas(data.personas, "plant");
  timeScrubber.max = Math.max(0, data.trustTimeline.length - 1);
  timeScrubber.value = "0";
  setTimelineState(0);

  topologyNodes.addEventListener("click", (event) => {
    handleNodeActivate(event.target);
  });

  topologyNodes.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleNodeActivate(event.target);
    }
  });
}

seedPulseGrid();
updateSlaModel(slaRange.value);

fetch("data/mesh.json")
  .then((response) => response.json())
  .then((data) => bootWithData(data))
  .catch(() => {
    bootWithData({
      hero: { streams: "50k+", sla: "99.94%", resolution: "8.2 min" },
      trustTimeline: [
        { label: "Now • Nominal state", trust: 92, incidents: ["inc-001"] },
        { label: "T-35 min • Warning escalation", trust: 78, incidents: ["inc-001", "inc-002"] },
        { label: "T-2 hr • Contract violation", trust: 63, incidents: ["inc-001", "inc-002", "inc-003"] }
      ],
      trustSpark: [70, 74, 78, 82, 85, 88, 91, 94, 92, 90, 88, 87, 89, 92, 93, 92],
      incidents: [
        { id: "inc-001", title: "Freshness drift — pump12", stream: "rotterdam.crude_unit.vibration.pump12", severity: "critical" },
        { id: "inc-002", title: "Schema regression — edge gateway", stream: "spartanburg.weldline.gate-02", severity: "warning" },
        { id: "inc-003", title: "Contract sync lag", stream: "northsea.turbine.eta-04", severity: "warning" }
      ],
      topology: {
        nodes: [
          { id: "rot-pump12", x: 90, y: 70, r: 16, status: "nominal" },
          { id: "rot-agg", x: 240, y: 120, r: 20, status: "nominal" },
          { id: "rot-gateway", x: 380, y: 90, r: 16, status: "warning" },
          { id: "spn-ops", x: 220, y: 260, r: 18, status: "nominal" },
          { id: "spn-model", x: 380, y: 250, r: 14, status: "warning" },
          { id: "nsea-hub", x: 520, y: 160, r: 24, status: "critical" }
        ],
        edges: [
          { from: "rot-pump12", to: "rot-agg", status: "nominal" },
          { from: "rot-agg", to: "rot-gateway", status: "warning" },
          { from: "rot-agg", to: "spn-ops", status: "nominal" },
          { from: "spn-ops", to: "spn-model", status: "warning" },
          { from: "rot-gateway", to: "nsea-hub", status: "warning" },
          { from: "spn-model", to: "nsea-hub", status: "critical" }
        ]
      },
      personas: {
        plant: {
          title: "Plant Process Engineer",
          summary: "Operational view filtered to the Rotterdam crude unit, highlighting contract health tied to control loops and safety thresholds.",
          focus: [
            "Live freshness lag for critical pumps",
            "Impact cone for degraded vibration stream",
            "Escalation path to data platform SRE"
          ],
          actions: ["Acknowledge incident", "Open timeline replay", "Create escalation note"]
        },
        compliance: {
          title: "Compliance & Quality Officer",
          summary: "Audit-first workspace showing immutable contract history, approvals, and lineage provenance for regulated workflows.",
          focus: ["Tamper-evident contract ledger", "Retention policy status", "Approval gates for schema changes"],
          actions: ["Review contract diff", "Approve policy exception", "Export audit packet"]
        },
        executive: {
          title: "Executive Digital Operations",
          summary: "Portfolio dashboard with enterprise-wide contract maturity, reliability trends, and investment signals.",
          focus: ["Global contract coverage", "Violation trend velocity", "Top at-risk plants"],
          actions: ["Open maturity report", "Schedule reliability review", "Request plant deep dive"]
        }
      }
    });
  });

timeScrubber.addEventListener("input", (event) => {
  setTimelineState(Number(event.target.value));
});

slaRange.addEventListener("input", (event) => {
  updateSlaModel(event.target.value);
});

drawerClose.addEventListener("click", () => {
  closeDrawer();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && contractDrawer.classList.contains("is-open")) {
    closeDrawer();
  }
});

personaTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActivePersonaTab(tab);
    if (meshData) {
      renderPersonas(meshData.personas, tab.dataset.persona);
    }
  });

  tab.addEventListener("keydown", (event) => {
    const currentIndex = personaTabs.indexOf(tab);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = personaTabs[(currentIndex + 1) % personaTabs.length];
      next.focus();
      next.click();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = personaTabs[(currentIndex - 1 + personaTabs.length) % personaTabs.length];
      prev.focus();
      prev.click();
    }
    if (event.key === "Home") {
      event.preventDefault();
      personaTabs[0].focus();
      personaTabs[0].click();
    }
    if (event.key === "End") {
      event.preventDefault();
      personaTabs[personaTabs.length - 1].focus();
      personaTabs[personaTabs.length - 1].click();
    }
  });
});

setActivePersonaTab(personaTabs[0]);
