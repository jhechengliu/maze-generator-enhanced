import {buildMaze} from './lib/main.js';
import {config} from './config.js';
import {algorithms} from './lib/algorithms.js';
import {shapes} from './lib/shapes.js';
import {drawingSurfaces} from './lib/drawingSurfaces.js';
import {
    ALGORITHM_NONE, METADATA_END_CELL, METADATA_START_CELL, EXITS_NONE, EXITS_HARDEST, EXITS_HORIZONTAL, EXITS_VERTICAL,
    SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE
} from './lib/constants.js';

class BatchGenerator {
    constructor() {
        this.model = {
            shape: 'square',
            size: {},
            algorithm: config.shapes.square.defaultAlgorithm,
            exitConfig: EXITS_VERTICAL
        };
        this.generatedFiles = [];
        this.errors = [];
        this.isGenerating = false;
        
        this.loadSettings();
        this.initializeUI();
        this.setupEventListeners();
    }

    initializeUI() {
        this.setupShapeSelector();
        this.setupSizeParameters();
        this.setupAlgorithmSelector();
        this.setupExitConfigs();
        
        // Set default values
        this.setDefaultValues();
    }

    setupShapeSelector() {
        const shapeList = document.getElementById('shapeSelector');
        Object.keys(shapes).forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.onclick = () => this.selectShape(name);
            shapeList.appendChild(li);
        });
    }

    setupSizeParameters() {
        this.updateSizeParameters();
    }

    setupAlgorithmSelector() {
        const algorithmList = document.getElementById('algorithmSelector');
        Object.entries(algorithms).filter(([id, algorithm]) => id !== ALGORITHM_NONE).forEach(([id, algorithm]) => {
            const li = document.createElement('li');
            li.textContent = algorithm.metadata.description;
            li.onclick = () => this.selectAlgorithm(id);
            algorithmList.appendChild(li);
        });
    }

    setupExitConfigs() {
        const exitList = document.getElementById('exitSelector');
        const exitConfigs = [
            {description: 'Vertical', value: EXITS_VERTICAL},
            {description: 'Horizontal', value: EXITS_HORIZONTAL},
            {description: 'Hardest', value: EXITS_HARDEST}
        ];
        
        exitConfigs.forEach(config => {
            const li = document.createElement('li');
            li.textContent = config.description;
            li.onclick = () => this.selectExitConfig(config.value);
            exitList.appendChild(li);
        });
    }

    setDefaultValues() {
        // Use saved settings or defaults
        const savedShape = this.model.shape || 'square';
        const savedExitConfig = this.model.exitConfig || EXITS_VERTICAL;
        
        this.selectShape(savedShape);
        // Use the same logic as the original code to get the default algorithm
        const defaultAlgorithm = config.shapes[savedShape].defaultAlgorithm;
        const savedAlgorithm = this.model.algorithm || defaultAlgorithm;
        this.selectAlgorithm(savedAlgorithm);
        this.selectExitConfig(savedExitConfig);
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('mazeBatchSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.model = { ...this.model, ...settings };
            }
        } catch (error) {
            console.warn('Failed to load saved settings:', error);
        }
    }

    saveSettings() {
        try {
            const settingsToSave = {
                shape: this.model.shape,
                size: this.model.size,
                algorithm: this.model.algorithm,
                exitConfig: this.model.exitConfig
            };
            localStorage.setItem('mazeBatchSettings', JSON.stringify(settingsToSave));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    clearSettings() {
        if (confirm('Are you sure you want to clear all saved settings? This will reset to default values.')) {
            try {
                localStorage.removeItem('mazeBatchSettings');
                // Reset to defaults
                this.model = {
                    shape: 'square',
                    size: {},
                    algorithm: config.shapes.square.defaultAlgorithm,
                    exitConfig: EXITS_VERTICAL
                };
                this.setDefaultValues();
                this.updateSizeParameters();
                alert('Settings cleared successfully!');
            } catch (error) {
                console.warn('Failed to clear settings:', error);
                alert('Failed to clear settings. Please try again.');
            }
        }
    }

    selectShape(shapeName) {
        this.model.shape = shapeName;
        this.updateShapeSelection(shapeName);
        this.updateSizeParameters();
        this.updateAlgorithmSelector();
        this.saveSettings();
    }

    selectAlgorithm(algorithmId) {
        console.log(`Selecting algorithm: ${algorithmId}`); // Debug log
        this.model.algorithm = algorithmId;
        this.updateAlgorithmSelection(algorithmId);
        this.saveSettings();
    }

    selectExitConfig(exitConfig) {
        this.model.exitConfig = exitConfig;
        this.updateExitSelection(exitConfig);
        this.saveSettings();
    }

    updateShapeSelection(selectedShape) {
        const items = document.querySelectorAll('#shapeSelector li');
        items.forEach(item => {
            item.classList.toggle('selected', item.textContent === selectedShape);
        });
    }

    updateAlgorithmSelection(selectedAlgorithm) {
        const items = document.querySelectorAll('#algorithmSelector li');
        items.forEach((item) => {
            // Find the algorithm ID by matching the text content
            const itemText = item.textContent;
            const matchingAlgorithm = Object.entries(algorithms).find(([id, algorithm]) => 
                algorithm.metadata.description === itemText && id !== ALGORITHM_NONE
            );
            
            if (matchingAlgorithm) {
                const algorithmId = matchingAlgorithm[0];
                item.classList.toggle('selected', algorithmId === selectedAlgorithm);
            }
        });
    }

    updateExitSelection(selectedExit) {
        const items = document.querySelectorAll('#exitSelector li');
        const exitConfigs = [EXITS_VERTICAL, EXITS_HORIZONTAL, EXITS_HARDEST];
        items.forEach((item, index) => {
            item.classList.toggle('selected', exitConfigs[index] === selectedExit);
        });
    }

    updateSizeParameters() {
        const shape = this.model.shape;
        const parameters = config.shapes[shape].parameters;
        
        const sizeList = document.getElementById('sizeParameters');
        sizeList.innerHTML = '';

        Object.entries(parameters).forEach(([paramName, paramValues]) => {
            // Use saved value or default
            const savedValue = this.model.size[paramName];
            const value = savedValue !== undefined ? savedValue : paramValues.initial;
            
            const li = document.createElement('li');
            li.innerHTML = `<label>${paramName}: <input type="number" min="${paramValues.min}" max="${paramValues.max}" value="${value}" onchange="window.batchGenerator.updateSizeParameter('${paramName}', this.value)"></label>`;
            sizeList.appendChild(li);
            this.model.size[paramName] = value;
        });
    }

    updateSizeParameter(name, value) {
        this.model.size[name] = parseInt(value);
        this.saveSettings();
    }

    updateAlgorithmSelector() {
        const shape = this.model.shape;
        const algorithmList = document.getElementById('algorithmSelector');
        algorithmList.innerHTML = '';

        // Get available algorithms for this shape
        const availableAlgorithms = Object.entries(algorithms).filter(([algorithmId, algorithm]) => {
            return algorithmId !== ALGORITHM_NONE && 
                   algorithm.metadata.shapes.includes(shape);
        });

        // Check if current algorithm is still valid for this shape
        const currentAlgorithmValid = availableAlgorithms.some(([algorithmId, _]) => algorithmId === this.model.algorithm);
        
        // If current algorithm is not valid for this shape, use the default
        if (!currentAlgorithmValid) {
            this.model.algorithm = config.shapes[shape].defaultAlgorithm;
        }

        availableAlgorithms.forEach(([algorithmId, algorithm]) => {
            const li = document.createElement('li');
            li.textContent = algorithm.metadata.description;
            li.onclick = () => this.selectAlgorithm(algorithmId);
            
            // Mark as selected if this is the current algorithm
            if (algorithmId === this.model.algorithm) {
                li.classList.add('selected');
            }
            
            algorithmList.appendChild(li);
        });
    }

    setupEventListeners() {
        document.getElementById('generateBatch').onclick = () => this.generateBatch();
        document.getElementById('downloadZip').onclick = () => this.downloadZip();
        document.getElementById('clearSettings').onclick = () => this.clearSettings();
        
        // Seed input method event listeners
        this.setupSeedInputListeners();
        
        // Make instance globally accessible for size parameter updates
        window.batchGenerator = this;
        
        // Add test function to verify seed consistency
        window.testSeedConsistency = () => this.testSeedConsistency();
    }

    setupSeedInputListeners() {
        // Radio button change listeners
        document.querySelectorAll('input[name="seedMethod"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateSeedPreview());
        });
        
        // Input field listeners
        document.getElementById('seedInputComma').addEventListener('input', () => this.updateSeedPreview());
        document.getElementById('seedInputRangeStart').addEventListener('input', () => this.updateSeedPreview());
        document.getElementById('seedInputRangeEnd').addEventListener('input', () => this.updateSeedPreview());
        document.getElementById('seedInputRangeStep').addEventListener('input', () => this.updateSeedPreview());
        document.getElementById('seedInputRandomCount').addEventListener('input', () => this.updateSeedPreview());
        document.getElementById('seedInputPreset').addEventListener('change', () => this.updateSeedPreview());
        
        // Initialize preview
        this.updateSeedPreview();
    }

    updateSeedPreview() {
        try {
            const seeds = this.getSeedsFromInput();
            const preview = seeds.slice(0, 10).join(', '); // Show first 10 seeds
            const count = seeds.length;
            
            document.getElementById('seedPreview').textContent = 
                count > 10 ? `${preview}...` : preview;
            document.getElementById('seedCount').textContent = 
                `(${count} seed${count !== 1 ? 's' : ''})`;
        } catch (error) {
            document.getElementById('seedPreview').textContent = 'Invalid input';
            document.getElementById('seedCount').textContent = '(0 seeds)';
        }
    }

    getSeedsFromInput() {
        const method = document.querySelector('input[name="seedMethod"]:checked').value;
        
        switch (method) {
            case 'comma':
                return this.parseCommaSeeds();
            case 'range':
                return this.parseRangeSeeds();
            case 'random':
                return this.generateRandomSeeds();
            case 'preset':
                return this.parsePresetSeeds();
            default:
                throw new Error('Invalid seed method');
        }
    }

    parseCommaSeeds() {
        const input = document.getElementById('seedInputComma').value;
        if (!input.trim()) return [];
        
        const seeds = input.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const parsedSeeds = [];
        
        for (const seed of seeds) {
            const num = parseInt(seed);
            if (isNaN(num)) {
                throw new Error(`Invalid seed: ${seed}`);
            }
            parsedSeeds.push(num);
        }
        
        return parsedSeeds;
    }

    parseRangeSeeds() {
        const start = parseInt(document.getElementById('seedInputRangeStart').value);
        const end = parseInt(document.getElementById('seedInputRangeEnd').value);
        const step = parseInt(document.getElementById('seedInputRangeStep').value) || 1;
        
        if (isNaN(start) || isNaN(end)) {
            throw new Error('Please enter valid start and end values');
        }
        
        if (step <= 0) {
            throw new Error('Step value must be positive');
        }
        
        const seeds = [];
        
        // Handle both forward and backward ranges
        if (start <= end) {
            // Forward range: start to end
            for (let i = start; i <= end; i += step) {
                seeds.push(i);
            }
        } else {
            // Backward range: start to end (decreasing)
            for (let i = start; i >= end; i -= step) {
                seeds.push(i);
            }
        }
        
        return seeds;
    }

    generateRandomSeeds() {
        const count = parseInt(document.getElementById('seedInputRandomCount').value) || 5;
        
        if (count < 1 || count > 100) {
            throw new Error('Count must be between 1 and 100');
        }
        
        const seeds = [];
        const used = new Set();
        
        while (seeds.length < count) {
            const randomSeed = Math.floor(Math.random() * 999999) + 1;
            if (!used.has(randomSeed)) {
                used.add(randomSeed);
                seeds.push(randomSeed);
            }
        }
        
        return seeds.sort((a, b) => a - b);
    }

    parsePresetSeeds() {
        const preset = document.getElementById('seedInputPreset').value;
        if (!preset) return [];
        
        // Parse the preset value as comma-separated seeds
        const seeds = preset.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const parsedSeeds = [];
        
        for (const seed of seeds) {
            const num = parseInt(seed);
            if (isNaN(num)) {
                throw new Error(`Invalid seed: ${seed}`);
            }
            parsedSeeds.push(num);
        }
        
        return parsedSeeds;
    }

    parseSeeds(seedInput) {
        // Legacy method - now delegates to new system
        document.getElementById('seedInputComma').value = seedInput;
        document.querySelector('input[name="seedMethod"][value="comma"]').checked = true;
        return this.getSeedsFromInput();
    }

    async generateBatch() {
        if (this.isGenerating) return;
        
        const generateMaze = document.getElementById('generateMaze').checked;
        const generateSolution = document.getElementById('generateSolution').checked;
        const generateDistance = document.getElementById('generateDistance').checked;
        
        if (!generateMaze && !generateSolution && !generateDistance) {
            alert('Please select at least one generation option');
            return;
        }
        
        let seeds;
        try {
            seeds = this.getSeedsFromInput();
            console.log('Parsed seeds:', seeds); // Debug log
            
            if (seeds.length === 0) {
                alert('Please provide at least one seed');
                return;
            }
            
            if (seeds.length > 100) {
                alert('Maximum 100 seeds allowed');
                return;
            }
        } catch (error) {
            alert(error.message);
            return;
        }
        
        this.isGenerating = true;
        this.generatedFiles = [];
        this.errors = [];
        
        this.showProgress();
        this.updateProgress(0, `Starting generation of ${seeds.length} mazes...`);
        
        const totalSteps = seeds.length * (generateMaze + generateSolution + generateDistance);
        let currentStep = 0;
        
        for (let i = 0; i < seeds.length; i++) {
            const seed = seeds[i];
            
            try {
                this.updateProgress(currentStep / totalSteps, `Generating maze ${i + 1} of ${seeds.length} (seed: ${seed})...`);
                console.log(`Generating maze for seed: ${seed}`); // Debug log
                
                const maze = await this.generateMazeForSeed(seed);
                
                if (generateMaze) {
                    const mazeSvg = this.generateMazeSvg(maze, seed);
                    this.generatedFiles.push({
                        name: `Map_maze_${this.model.shape}_${Object.values(this.model.size).join('_')}_${seed}.svg`,
                        content: mazeSvg
                    });
                    currentStep++;
                }
                
                if (generateSolution) {
                    const solutionSvg = this.generateSolutionSvg(maze, seed);
                    this.generatedFiles.push({
                        name: `Sol_maze_${this.model.shape}_${Object.values(this.model.size).join('_')}_${seed}.svg`,
                        content: solutionSvg
                    });
                    currentStep++;
                }
                
                if (generateDistance) {
                    const distanceSvg = this.generateDistanceSvg(maze, seed);
                    this.generatedFiles.push({
                        name: `Dist_maze_${this.model.shape}_${Object.values(this.model.size).join('_')}_${seed}.svg`,
                        content: distanceSvg
                    });
                    currentStep++;
                }
                
                this.updateProgress(currentStep / totalSteps, `Generated maze ${i + 1} of ${seeds.length} (seed: ${seed})`);
                
            } catch (error) {
                this.errors.push(`Seed ${seed}: ${error.message}`);
                currentStep += (generateMaze + generateSolution + generateDistance);
            }
        }
        
        this.isGenerating = false;
        this.hideProgress();
        this.showResults();
        
        // Also flash the progress bar briefly to show completion
        this.flashProgressBar();
    }

    async generateMazeForSeed(seed) {
        // Create grid configuration exactly like the original code
        const grid = Object.assign({'cellShape': this.model.shape}, this.model.size);
        
        // Create a temporary canvas element for batch generation
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 500;
        tempCanvas.height = 500;
        
        console.log('Grid config:', grid); // Debug log
        console.log('Algorithm:', this.model.algorithm); // Debug log
        console.log('Seed:', seed); // Debug log
        console.log('Exit config:', this.model.exitConfig); // Debug log
        
        const maze = buildMaze({
            grid,
            'algorithm': this.model.algorithm,
            'randomSeed': seed,
            'element': tempCanvas,
            'mask': [],
            'exitConfig': this.model.exitConfig
        });
        
        // Run algorithm to completion
        maze.runAlgorithm.toCompletion();
        
        return maze;
    }

    generateMazeSvg(maze, seed) {
        const SVG_SIZE = 500;
        const elSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        elSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        elSvg.setAttribute('width', SVG_SIZE);
        elSvg.setAttribute('height', SVG_SIZE);
        
        const svgDrawingSurface = drawingSurfaces.svg({el: elSvg});
        maze.render(svgDrawingSurface);
        
        const svgData = elSvg.outerHTML;
        const prolog = '<?xml version="1.0" standalone="no"?>';
        return prolog + svgData;
    }

    generateSolutionSvg(maze, seed) {
        // Find start and end cells
        let startCell, endCell;
        maze.forEachCell(cell => {
            if (cell.metadata[METADATA_START_CELL]) startCell = cell;
            if (cell.metadata[METADATA_END_CELL]) endCell = cell;
        });
        
        if (!startCell || !endCell) {
            throw new Error('No start/end cells found');
        }
        
        // Find solution path
        maze.findPathBetween(startCell.coords, endCell.coords);
        
        // Generate SVG
        const svg = this.generateMazeSvg(maze, seed);
        
        // Clear path for next use
        maze.clearPathAndSolution();
        
        return svg;
    }

    generateDistanceSvg(maze, seed) {
        // Find start cell for distance calculation
        let startCell;
        maze.forEachCell(cell => {
            if (cell.metadata[METADATA_START_CELL]) startCell = cell;
        });
        
        if (!startCell) {
            startCell = maze.randomCell();
        }
        
        // Calculate distances from start cell
        maze.findDistancesFrom(...startCell.coords);
        
        // Generate SVG
        const svg = this.generateMazeSvg(maze, seed);
        
        // Clear distances for next use
        maze.clearDistances();
        
        return svg;
    }

    showProgress() {
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('resultsContainer').style.display = 'none';
    }

    hideProgress() {
        document.getElementById('progressContainer').style.display = 'none';
    }

    updateProgress(percent, text) {
        document.getElementById('progressText').textContent = text;
        document.getElementById('progressFill').style.width = (percent * 100) + '%';
    }

    showResults() {
        const resultsContainer = document.getElementById('resultsContainer');
        const resultsSummary = document.getElementById('resultsSummary');
        const errorLog = document.getElementById('errorLog');
        
        resultsContainer.style.display = 'block';
        
        // Update summary
        const successCount = this.generatedFiles.length;
        const errorCount = this.errors.length;
        
        resultsSummary.innerHTML = `
            <strong>Generation Complete!</strong><br>
            Successfully generated: <strong>${successCount}</strong> files<br>
            Errors: <strong>${errorCount}</strong><br>
            ${successCount > 0 ? 'Click "Download ZIP" to save all files.' : ''}
        `;
        
        // Show errors if any
        if (this.errors.length > 0) {
            errorLog.innerHTML = '<strong>Errors:</strong><br>' + this.errors.join('<br>');
            errorLog.style.display = 'block';
        } else {
            errorLog.style.display = 'none';
        }
        
        // Add flash effect to indicate completion
        this.flashResultsPanel();
    }

    flashResultsPanel() {
        const resultsPanel = document.getElementById('resultsPanel');
        
        // Add flash animation class
        resultsPanel.classList.add('flash-effect');
        
        // Remove the class after animation completes
        setTimeout(() => {
            resultsPanel.classList.remove('flash-effect');
        }, 1000); // 1 second duration
    }

    flashProgressBar() {
        const progressBar = document.getElementById('progressBar');
        
        // Add a brief green flash to indicate success
        progressBar.style.backgroundColor = '#28a745';
        progressBar.style.transition = 'background-color 0.3s ease';
        
        setTimeout(() => {
            progressBar.style.backgroundColor = '#e0e0e0';
        }, 500);
    }

    async downloadZip() {
        if (this.generatedFiles.length === 0) {
            alert('No files to download');
            return;
        }
        
        try {
            if (typeof JSZip !== 'undefined') {
                await this.downloadAsZip();
            } else {
                this.downloadFilesIndividually();
            }
        } catch (error) {
            alert('Download failed: ' + error.message);
        }
    }

    async downloadAsZip() {
        const zip = new JSZip();
        
        // Add all files to the ZIP
        this.generatedFiles.forEach(file => {
            zip.file(file.name, file.content);
        });
        
        // Generate and download the ZIP file
        const zipBlob = await zip.generateAsync({type: 'blob'});
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        
        // Create descriptive filename with maze configuration
        const algorithmName = this.getAlgorithmDisplayName(this.model.algorithm);
        const shapeName = this.model.shape.charAt(0).toUpperCase() + this.model.shape.slice(1);
        const sizeString = Object.values(this.model.size).join('x');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        
        a.download = `${algorithmName} ${shapeName} ${sizeString} ${timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`Successfully downloaded ZIP file with ${this.generatedFiles.length} files!`);
    }

    downloadFilesIndividually() {
        this.generatedFiles.forEach(file => {
            const blob = new Blob([file.content], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        
        alert(`Downloaded ${this.generatedFiles.length} files individually.`);
    }

    getAlgorithmDisplayName(algorithmId) {
        // Get the display name from the algorithms object
        const algorithm = algorithms[algorithmId];
        if (algorithm && algorithm.metadata && algorithm.metadata.description) {
            return algorithm.metadata.description;
        }
        // Fallback to algorithm ID if description not found
        return algorithmId;
    }

    async testSeedConsistency() {
        console.log('Testing seed consistency...');
        const testSeed = 123;
        
        // Generate maze 1
        const maze1 = await this.generateMazeForSeed(testSeed);
        const svg1 = this.generateMazeSvg(maze1, testSeed);
        
        // Generate maze 2 with same seed
        const maze2 = await this.generateMazeForSeed(testSeed);
        const svg2 = this.generateMazeSvg(maze2, testSeed);
        
        // Compare the SVGs
        if (svg1 === svg2) {
            console.log('✅ Seed consistency test PASSED - same seed produces same result');
            alert('Seed consistency test PASSED - same seed produces same result');
        } else {
            console.log('❌ Seed consistency test FAILED - same seed produces different results');
            alert('Seed consistency test FAILED - same seed produces different results');
        }
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    new BatchGenerator();
}); 