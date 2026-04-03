(() => {
  const MODULES = [
    { id: "core", label: "Core", path: "../ontology/oc-core.ttl", color: "#1f4e79" },
    { id: "people", label: "People", path: "../ontology/oc-people.ttl", color: "#8c5a2b" },
    { id: "ppe", label: "PPE", path: "../ontology/oc-ppe.ttl", color: "#7a5c3a" },
    { id: "equipment", label: "Equipment", path: "../ontology/oc-equipment.ttl", color: "#2c6e49" },
    { id: "structural", label: "Structural", path: "../ontology/oc-structural.ttl", color: "#6b4e71" },
    { id: "materials", label: "Materials", path: "../ontology/oc-materials.ttl", color: "#5f6c37" }
  ];

  const ROOT_URI = "https://openconstruction.org/ontology/";
  const state = { concepts: new Map(), filtered: [], selectedId: null, treeRoot: null, datasetMeta: new Map() };

  const byId = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const normalizeSpaces = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
  const first = (arr) => Array.isArray(arr) && arr.length ? arr[0] : null;

  function extractLiteralList(segment) {
    const values = [];
    let match = null;
    const triple = /"""([\s\S]*?)"""@en/g;
    while ((match = triple.exec(segment))) values.push(normalizeSpaces(match[1]));
    const single = /"([^"]+)"@en/g;
    while ((match = single.exec(segment))) values.push(normalizeSpaces(match[1]));
    return values;
  }

  function extractOcRefs(segment) {
    const refs = [];
    const regex = /oc:([A-Za-z0-9_]+)/g;
    let match = null;
    while ((match = regex.exec(segment))) refs.push(match[1]);
    return refs;
  }

  function getPredicateSegment(text, predicate) {
    const idx = text.indexOf(predicate);
    if (idx < 0) return "";
    const tail = text.slice(idx + predicate.length);
    const end = tail.search(/\s[a-z]+:[A-Za-z]+[\s]/);
    return end >= 0 ? tail.slice(0, end) : tail;
  }

  function ensureConcept(id) {
    if (!state.concepts.has(id)) {
      state.concepts.set(id, {
        id,
        uri: `${ROOT_URI}${id}`,
        prefLabel: id,
        altLabels: [],
        broader: [],
        narrower: [],
        comment: "",
        datasets: new Set(),
        module: "core",
        moduleLabel: "Core",
        sourcePath: "../ontology/oc-core.ttl"
      });
    }
    return state.concepts.get(id);
  }

  function parseTurtleConcepts(ttl, moduleMeta) {
    const lines = ttl.split(/\r?\n/);
    let current = [];
    let subject = null;

    function flush() {
      if (!subject || !current.length) {
        current = [];
        subject = null;
        return;
      }

      const block = current.join(" ");
      const idMatch = block.match(/^oc:([A-Za-z0-9_]+)/);
      if (!idMatch || !block.includes("skos:Concept")) {
        current = [];
        subject = null;
        return;
      }

      const id = idMatch[1];
      const concept = ensureConcept(id);
      concept.module = moduleMeta.id;
      concept.moduleLabel = moduleMeta.label;
      concept.sourcePath = moduleMeta.path;

      const pref = first(extractLiteralList(getPredicateSegment(block, "skos:prefLabel")));
      if (pref) concept.prefLabel = pref;

      const altSeg = getPredicateSegment(block, "skos:altLabel");
      if (altSeg) concept.altLabels = Array.from(new Set([...concept.altLabels, ...extractLiteralList(altSeg)]));

      const broaderSeg = getPredicateSegment(block, "skos:broader");
      if (broaderSeg) concept.broader = Array.from(new Set([...concept.broader, ...extractOcRefs(broaderSeg)]));

      const narrowerSeg = getPredicateSegment(block, "skos:narrower");
      if (narrowerSeg) concept.narrower = Array.from(new Set([...concept.narrower, ...extractOcRefs(narrowerSeg)]));

      const comment = first(extractLiteralList(getPredicateSegment(block, "rdfs:comment")));
      if (comment) concept.comment = comment;

      current = [];
      subject = null;
    }

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("oc:") && line.includes(" a ")) {
        flush();
        subject = line;
        current = [line];
        if (line.endsWith(".")) flush();
        continue;
      }
      if (subject) {
        current.push(line);
        if (line.endsWith(".")) flush();
      }
    }
    flush();
  }

  function postProcessConcepts() {
    for (const concept of state.concepts.values()) {
      for (const parentId of concept.broader) {
        const parent = ensureConcept(parentId);
        if (!parent.narrower.includes(concept.id)) parent.narrower.push(concept.id);
      }
    }
  }

  function countAltLabels() {
    let total = 0;
    for (const concept of state.concepts.values()) total += concept.altLabels.length;
    return total;
  }

  function normLabel(label) {
    return String(label ?? "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function datasetDetailHref(id) {
    return `datasets/detail.html?id=${encodeURIComponent(id)}`;
  }

  function recordDatasetForConcept(conceptId, datasetId) {
    const concept = state.concepts.get(conceptId);
    if (!concept || !datasetId) return;
    concept.datasets.add(datasetId);
  }

  function buildLabelIndex() {
    const index = new Map();
    for (const concept of state.concepts.values()) {
      const labels = [concept.id, concept.prefLabel, ...concept.altLabels];
      for (const label of labels) {
        const key = normLabel(label);
        if (!key) continue;
        if (!index.has(key)) index.set(key, new Set());
        index.get(key).add(concept.id);
      }
    }
    return index;
  }

  function loadDatasetAssociations(datasetsJson, mappingsJson) {
    const labelIndex = buildLabelIndex();
    const datasetArray = Array.isArray(datasetsJson)
      ? datasetsJson
      : Object.values(datasetsJson || {});

    for (const dataset of datasetArray) {
      const datasetId = dataset.id || dataset.name;
      if (!datasetId) continue;
      state.datasetMeta.set(datasetId, { id: datasetId, name: dataset.name || datasetId });

      for (const rawLabel of Array.isArray(dataset.classes) ? dataset.classes : []) {
        const ids = labelIndex.get(normLabel(rawLabel));
        if (!ids) continue;
        for (const conceptId of ids) recordDatasetForConcept(conceptId, datasetId);
      }
    }

    const mappings = Array.isArray(mappingsJson?.mappings) ? mappingsJson.mappings : [];
    for (const mapping of mappings) {
      const conceptId = String(mapping.canonical_uri || "").replace(ROOT_URI, "");
      if (state.concepts.has(conceptId) && mapping.dataset_id) {
        recordDatasetForConcept(conceptId, mapping.dataset_id);
      }
    }
  }

  function topAncestor(conceptId) {
    let current = state.concepts.get(conceptId);
    const seen = new Set();
    while (current && current.broader.length && !seen.has(current.id)) {
      seen.add(current.id);
      current = state.concepts.get(current.broader[0]);
    }
    return current ? current.id : conceptId;
  }

  function conceptDepth(conceptId) {
    let current = state.concepts.get(conceptId);
    const seen = new Set();
    let depth = 0;
    while (current && current.broader.length && !seen.has(current.id)) {
      seen.add(current.id);
      current = state.concepts.get(current.broader[0]);
      depth += 1;
    }
    return depth;
  }

  function conceptKind(concept) {
    const depth = conceptDepth(concept.id);
    if (depth === 0) return "top";
    if (concept.narrower.length) return "branch";
    return "leaf";
  }

  function conceptKindLabel(concept) {
    const kind = conceptKind(concept);
    if (kind === "top") return "Top concept";
    if (kind === "branch") return "Taxonomy class";
    return "Leaf concept";
  }

  function topLabel(concept) {
    const top = state.concepts.get(topAncestor(concept.id));
    return top ? top.prefLabel : concept.prefLabel;
  }

  function sortConcepts(items) {
    return items.slice().sort((a, b) => {
      const topCmp = topLabel(a).localeCompare(topLabel(b));
      if (topCmp) return topCmp;
      const depthCmp = conceptDepth(a.id) - conceptDepth(b.id);
      if (depthCmp) return depthCmp;
      return a.prefLabel.localeCompare(b.prefLabel);
    });
  }

  function colorForConcept(conceptId) {
    const top = topAncestor(conceptId);
    const concept = state.concepts.get(top);
    const module = MODULES.find((m) => m.id === (concept ? concept.module : "core"));
    return module ? module.color : "#1f4e79";
  }

  function renderModulePills() {
    byId("modulePills").innerHTML = MODULES.map((module) => `
      <a class="module-pill" href="${esc(module.path)}" target="_blank" rel="noopener">
        <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${module.color};"></span>
        ${esc(module.label)}
      </a>
    `).join("");
  }

  function renderRawLinks() {
    byId("rawLinks").innerHTML = MODULES.map((module) => `
      <a class="chip" href="${esc(module.path)}" target="_blank" rel="noopener">
        <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${module.color};"></span>
        ${esc(module.label)}.ttl
      </a>
    `).join("") + `<a class="chip" href="../ontology/GOVERNANCE.md" target="_blank" rel="noopener">Governance</a>`;
    byId("rawPreview").textContent = MODULES.map((module) => `${module.label}: ${module.path}`).join("\n");
  }

  function setStats() {
    const concepts = Array.from(state.concepts.values()).filter((c) => c.id !== "ConceptScheme");
    byId("statConcepts").textContent = String(concepts.length);
    byId("statTop").textContent = String(concepts.filter((c) => c.broader.length === 0).length);
    byId("statAltLabels").textContent = String(countAltLabels());
    byId("statModules").textContent = String(MODULES.length);
  }

  function buildTreeData() {
    const concepts = Array.from(state.concepts.values()).filter((c) => c.id !== "ConceptScheme");
    const childrenByParent = new Map();
    for (const concept of concepts) {
      const parentId = concept.broader.length ? concept.broader[0] : "__root__";
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId).push(concept.id);
    }

    function makeNode(id) {
      const concept = state.concepts.get(id);
      const children = (childrenByParent.get(id) || [])
        .sort((a, b) => state.concepts.get(a).prefLabel.localeCompare(state.concepts.get(b).prefLabel))
        .map(makeNode);
      return { id, name: concept.prefLabel, concept, children };
    }

    state.treeRoot = {
      id: "__ontology__",
      name: "OpenConstruction Ontology",
      children: (childrenByParent.get("__root__") || [])
        .sort((a, b) => state.concepts.get(a).prefLabel.localeCompare(state.concepts.get(b).prefLabel))
        .map(makeNode)
    };
  }

  function renderTree() {
    const wrap = byId("treeWrap");
    const empty = byId("treeEmpty");
    wrap.querySelector("svg")?.remove();
    if (!state.treeRoot) {
      empty.style.display = "flex";
      return;
    }
    empty.style.display = "none";

    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    const root = d3.hierarchy(state.treeRoot);
    d3.tree().size([height - 40, width - 180])(root);

    const svg = d3.select(wrap).append("svg").attr("width", width).attr("height", height);
    const g = svg.append("g").attr("transform", "translate(90,20)");

    g.selectAll(".link")
      .data(root.links())
      .join("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal().x((d) => d.y).y((d) => d.x));

    const nodes = g.selectAll(".node")
      .data(root.descendants().filter((d) => d.depth > 0))
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    nodes.append("circle")
      .attr("r", (d) => d.depth === 1 ? 7 : 5)
      .attr("fill", (d) => colorForConcept(d.data.id))
      .on("click", (_, d) => selectConcept(d.data.id));

    nodes.append("text")
      .attr("x", (d) => d.children?.length ? -10 : 10)
      .attr("dy", "0.32em")
      .attr("text-anchor", (d) => d.children?.length ? "end" : "start")
      .text((d) => d.data.name)
      .on("click", (_, d) => selectConcept(d.data.id));
  }

  function conceptSearchHaystack(concept) {
    return [
      concept.id,
      concept.prefLabel,
      concept.moduleLabel,
      concept.comment,
      ...concept.altLabels,
      ...concept.broader.map((id) => state.concepts.get(id)?.prefLabel || id),
      ...concept.narrower.map((id) => state.concepts.get(id)?.prefLabel || id)
    ].join(" ").toLowerCase();
  }

  function filterConcepts(query) {
    const q = normalizeSpaces(query).toLowerCase();
    const concepts = sortConcepts(Array.from(state.concepts.values()).filter((c) => c.id !== "ConceptScheme"));
    if (!q) return concepts;
    return concepts.filter((concept) => conceptSearchHaystack(concept).includes(q));
  }

  function renderConceptList() {
    const list = byId("conceptList");
    const subtitle = byId("listSubtitle");
    const items = state.filtered;
    subtitle.textContent = items.length === state.concepts.size - 1 ? "Grouped by top concept and taxonomy role" : `${items.length} matching concept(s)`;

    if (!items.length) {
      list.innerHTML = `<div class="empty-state">No concepts match the current search. Try a broader term such as <strong>worker</strong>, <strong>hard hat</strong>, or <strong>excavator</strong>.</div>`;
      return;
    }

    const grouped = new Map();
    for (const concept of items) {
      const group = topLabel(concept);
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group).push(concept);
    }

    list.innerHTML = Array.from(grouped.entries()).map(([groupLabel, concepts]) => {
      const body = concepts.map((concept) => {
        const broader = concept.broader.map((id) => state.concepts.get(id)?.prefLabel || id).join(" · ");
        const active = state.selectedId === concept.id ? " active" : "";
        const datasetCount = concept.datasets.size;
        const roleLabel = conceptKindLabel(concept);
        const datasetLabel = datasetCount > 0 ? `${datasetCount} dataset(s)` : (conceptKind(concept) === "leaf" ? "No linked datasets yet" : roleLabel);
        return `
          <div class="concept-item${active}" data-concept-id="${esc(concept.id)}">
            <div class="name">${esc(concept.prefLabel)}</div>
            <div class="meta">
              <span>${esc(concept.id)}</span>
              <span>•</span>
              <span>${esc(concept.moduleLabel)}</span>
              <span>•</span>
              <span>${esc(datasetLabel)}</span>
              ${broader ? `<span>•</span><span>${esc(broader)}</span>` : ""}
            </div>
          </div>
        `;
      }).join("");

      return `
        <div>
          <div class="detail-label" style="margin-bottom:10px;">${esc(groupLabel)}</div>
          ${body}
        </div>
      `;
    }).join("");
  }

  function detailChip(id) {
    const concept = state.concepts.get(id);
    if (!concept) return "";
    return `<button class="chip" type="button" data-concept-id="${esc(id)}">${esc(concept.prefLabel)}</button>`;
  }

  function renderDetail(conceptId) {
    const concept = state.concepts.get(conceptId);
    if (!concept) return;
    const module = MODULES.find((m) => m.id === concept.module);
    const parents = concept.broader.length ? concept.broader.map(detailChip).join("") : `<span class="chip chip-muted">Top concept</span>`;
    const children = concept.narrower.length ? concept.narrower.map(detailChip).join("") : `<span class="chip chip-muted">No narrower concepts</span>`;
    const alts = concept.altLabels.length ? concept.altLabels.map((label) => `<span class="chip">${esc(label)}</span>`).join("") : `<span class="chip chip-muted">No alternative labels</span>`;
    const comment = concept.comment || "No comment has been authored for this concept yet.";
    const roleLabel = conceptKindLabel(concept);
    const topConcept = state.concepts.get(topAncestor(concept.id));
    const datasets = Array.from(concept.datasets)
      .sort((a, b) => a.localeCompare(b))
      .map((id) => {
        const meta = state.datasetMeta.get(id);
        const label = meta?.name || id;
        return `<a class="chip" href="${esc(datasetDetailHref(id))}" title="${esc(label)}">${esc(id)}</a>`;
      })
      .join("") || `<span class="chip chip-muted">No linked datasets yet</span>`;

    byId("detailPane").innerHTML = `
      <div class="detail-title">${esc(concept.prefLabel)}</div>
      <div class="detail-uri">${esc(concept.uri)}</div>
      <div class="detail-links">
        <button class="btn btn-outline-dark btn-sm" type="button" id="copyUriBtn">Copy URI</button>
        <a class="btn btn-outline-primary btn-sm" href="${esc(concept.sourcePath)}" target="_blank" rel="noopener">Open source Turtle</a>
      </div>
      <div class="detail-block"><div class="detail-label">Canonical Id</div><div class="detail-text"><code>${esc(concept.id)}</code></div></div>
      <div class="detail-block"><div class="detail-label">Taxonomy Role</div><div class="chip-row"><span class="chip">${esc(roleLabel)}</span>${topConcept ? `<span class="chip">${esc(topConcept.prefLabel)}</span>` : ""}</div></div>
      <div class="detail-block"><div class="detail-label">Module</div><div class="chip-row"><span class="chip"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${module ? module.color : "#1f4e79"};"></span>${esc(concept.moduleLabel)}</span></div></div>
      <div class="detail-block"><div class="detail-label">Broader Concepts</div><div class="chip-row">${parents}</div></div>
      <div class="detail-block"><div class="detail-label">Narrower Concepts</div><div class="chip-row">${children}</div></div>
      <div class="detail-block"><div class="detail-label">Alternative Labels</div><div class="chip-row">${alts}</div></div>
      <div class="detail-block"><div class="detail-label">Associated Datasets</div><div class="chip-row">${datasets}</div></div>
      <div class="detail-block"><div class="detail-label">Comment</div><div class="detail-text">${esc(comment)}</div></div>
    `;

    byId("copyUriBtn")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(concept.uri);
        byId("copyUriBtn").textContent = "Copied URI";
      } catch {
        byId("copyUriBtn").textContent = "Copy failed";
      }
    });
  }

  function selectConcept(conceptId) {
    state.selectedId = conceptId;
    renderConceptList();
    renderDetail(conceptId);
  }

  function bindInteractions() {
    byId("ontologySearch").addEventListener("input", (event) => {
      state.filtered = filterConcepts(event.target.value);
      renderConceptList();
    });

    byId("btnResetExplorer").addEventListener("click", () => {
      byId("ontologySearch").value = "";
      state.filtered = filterConcepts("");
      const firstConcept = first(state.filtered);
      if (firstConcept) selectConcept(firstConcept.id);
      renderConceptList();
    });

    document.addEventListener("click", (event) => {
      const item = event.target.closest("[data-concept-id]");
      if (!item) return;
      selectConcept(item.getAttribute("data-concept-id"));
    });
  }

  async function loadOntology() {
    const treeSubtitle = byId("treeSubtitle");
    try {
      const ttlTexts = await Promise.all(MODULES.map(async (module) => {
        const response = await fetch(module.path, { cache: "no-store" });
        if (!response.ok) throw new Error(`Could not load ${module.path}: ${response.status}`);
        return { module, ttl: await response.text() };
      }));
      for (const entry of ttlTexts) parseTurtleConcepts(entry.ttl, entry.module);

      const [datasetsResponse, mappingsResponse] = await Promise.all([
        fetch("data/datasets.json", { cache: "no-store" }),
        fetch("data/object-label-mappings.json", { cache: "no-store" })
      ]);
      const datasetsJson = datasetsResponse.ok ? await datasetsResponse.json() : {};
      const mappingsJson = mappingsResponse.ok ? await mappingsResponse.json() : {};

      postProcessConcepts();
      loadDatasetAssociations(datasetsJson, mappingsJson);
      setStats();
      renderModulePills();
      renderRawLinks();
      buildTreeData();
      renderTree();
      state.filtered = filterConcepts("");
      renderConceptList();
      const firstConcept = first(state.filtered);
      if (firstConcept) selectConcept(firstConcept.id);
      treeSubtitle.textContent = `Loaded ${state.concepts.size - 1} concepts from ${MODULES.length} Turtle modules`;
    } catch (error) {
      console.warn("[ontology explorer] load error:", error);
      treeSubtitle.textContent = "Could not load ontology modules";
      byId("conceptList").innerHTML = `<div class="empty-state">The explorer could not load the ontology files. Make sure the local server is serving the repository root so <code>/ontology/*.ttl</code> is reachable.</div>`;
      byId("rawPreview").textContent = String(error.message || error);
    }
  }

  window.addEventListener("resize", () => {
    if (state.treeRoot) renderTree();
  });

  byId("yearNow").textContent = new Date().getFullYear();
  bindInteractions();
  loadOntology();
})();
