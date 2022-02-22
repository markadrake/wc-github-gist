class GitHubGist extends HTMLElement {

	/*
		Defines the attributes we want to monitor and allows us
		to monitor for changes with the `attributeChangedCallback`
		method.
	*/
	static get observedAttributes() { 
		return [
			"highlights"
		]; 
	}

	constructor() {
		super();
		this.isLoaded = false;
	}

	connectedCallback() {
		this.id = this.getAttribute("id");
		this.highlights = this.getAttribute("highlights");
		this.loadDependencies();
	}

	parseHighlights() {
		let data = JSON.parse(this.highlights);
		let fileEl = null;
		let scrollToHighlightCalled = false;

		this.querySelectorAll(".-active").forEach(el => {
			el.classList.remove("-active");
		});

		data.forEach((item, index) => {

			// File number
			if(index === 0) {
				fileEl = this.switchFileByIndex(item - 1);
				return;
			}

			// Line number(s)
			let lines = fileEl.querySelectorAll("tr");
			let min = item[0] - 1,
				max = item[1] - 1;

			lines.forEach((line, lineIndex) => {
				if(lineIndex >= min && lineIndex <= max) {
					if(!scrollToHighlightCalled) {
						scrollToHighlightCalled = true;
						this.scrollToHighlight(line);
					}
					line.classList.add("-active");
				}
			});
		});
		return data;
	}

	switchFileByIndex(index) {
		let fileEl = null;

		// Set active class
		let els = this.querySelectorAll("div > pre");
		els.forEach((el, elIndex) => {
			if(index == elIndex) {
				fileEl = el;
				el.classList.add("-active");
			}
		});

		// Set option value
		this.querySelector("select").value = index;

		return fileEl;
	}

	fetchGist() {
		let requestUrl = `https://api.github.com/gists/${this.id}`;
		fetch(requestUrl).then(response => response.json()).then(value => {
			this.gist = value.files;
			this.renderGist();
		});
	}

	renderGist() {
		const template = document.createElement("div");
		template.classList.add("github-gist");
		
		const listEl = document.createElement("select");

		const filesEl = document.createElement("div");

		Object.keys(this.gist).map((key, keyIndex) => {
			this.renderFileTab(listEl, key, keyIndex);
			this.renderFileCode(filesEl, key);
		});

		listEl.addEventListener("change", (e) => {
			this.switchFileByIndex(parseInt(listEl.value));
		});

		template.append(listEl);
		template.append(filesEl);
		this.render(template);
	}

	renderFileTab(el, key, keyIndex) {
		const liEl = document.createElement("option");
		liEl.innerText = key;
		liEl.value = keyIndex;
		el.appendChild(liEl);
	}

	renderFileCode(el, key) {
		const preEl = document.createElement("pre");
		const codeEl = document.createElement("code");

		this.detectCodeLanguage(codeEl, this.gist[key].language);

		codeEl.textContent = this.gist[key].content;

		preEl.append(codeEl);
		el.append(preEl);
	}

	render(el) {
		this.append(el);
		el.querySelector("pre").classList.add("-active");
		hljs.highlightAll();
		hljs.initLineNumbersOnLoad();
		this.parseHighlights();
		this.listenForHighlights();
	}

	detectCodeLanguage(el, language) {
		switch(language) {
			case "C#":
				el.classList.add("language-csharp");
				break;
			case "Html+Razor":
				el.classList.add("language-cshtml");
				break;
			case "Markdown":
				el.classList.add("language-markdown");
				break;
		}
	}

	loadDependencies() {

		let promises = [];

		let jsDependencies = [
			"//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/highlight.min.js",
			"//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/languages/csharp.min.js",
			"//unpkg.com/highlightjs-cshtml-razor/dist/cshtml-razor.min.js",
			"//cdnjs.cloudflare.com/ajax/libs/highlightjs-line-numbers.js/2.8.0/highlightjs-line-numbers.min.js"
		];

		promises.push(...jsDependencies.map(dep => this.loadDependency(dep, "script")));

		let cssDependencies = [
			"//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/styles/github-dark.min.css",
		];

		promises.push(...cssDependencies.map(dep => this.loadDependency(dep, "style")));

		Promise.all(promises).then((val) => {
			this.isLoaded = true;
			this.fetchGist();
		});

	}

	loadDependency(dep, type) {
		return new Promise((resolve, reject) => {

			// Type = "script"
			if(type === "script") {
				let el = document.createElement("script");
				el.src = dep;
				el.addEventListener("load", (e) => {
					resolve();
				});
				this.append(el);
			}

			// Type = "style"
			if(type === "style") {
				let el = document.createElement("link");
				el.rel = "stylesheet";
				el.href = dep;
				el.addEventListener("load", (e) => {
					resolve();
				});
				this.append(el);
			}

		});
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if(name === "highlights") {
			this.highlights = newValue;

			if(this.isLoaded)
				this.parseHighlights();
		}
	}

	listenForHighlights() {
		let els = document.querySelectorAll("[data-gist]");
		els.forEach(el => {
			el.addEventListener("mouseenter", (e) => {
				this.highlights = el.dataset.highlights;
				this.parseHighlights();
			});				
		});
	}

	scrollToHighlight(toLineEl) {
		let el = this.querySelector(".github-gist > div");
		el.scrollTo({ left: 0, top: toLineEl.offsetTop, behavior: "smooth"});		
	}
};

window.customElements.define("github-gist", GitHubGist);
