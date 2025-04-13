/**
 * WordLite - A minimal word processor
 * No frameworks, no dependencies, just vanilla JavaScript
 */

// Main application state
const wordlite = {
    currentDocument: {
        id: Date.now().toString(),
        title: 'Untitled Document',
        content: '',
        lastSaved: null
    },
    documents: [],
    saveTimeout: null,
    isZenMode: false,
    isThemeDark: false,
    commandPaletteOpen: false,
    commands: [
        { id: 'save', name: 'Save Document', shortcut: 'Ctrl+S', action: () => wordlite.saveDocument() },
        { id: 'new', name: 'New Document', shortcut: 'Ctrl+N', action: () => wordlite.createNewDocument() },
        { id: 'zen', name: 'Toggle Zen Mode', shortcut: 'Ctrl+E', action: () => wordlite.toggleZenMode() },
        { id: 'theme', name: 'Toggle Dark Theme', shortcut: 'Ctrl+Shift+D', action: () => wordlite.toggleTheme() },
        { id: 'export-pdf', name: 'Export as PDF', shortcut: '', action: () => wordlite.exportAsPDF() },
        { id: 'export-md', name: 'Export as Markdown', shortcut: '', action: () => wordlite.exportAsMarkdown() },
        { id: 'export-wdoc', name: 'Export as WDOC', shortcut: '', action: () => wordlite.exportAsWDOC() }
    ]
};

// DOM Elements
const editor = document.getElementById('editor');
const documentTitle = document.getElementById('documentTitle');
const formatToolbar = document.getElementById('formatToolbar');
const documentList = document.getElementById('documentList');
const wordCount = document.getElementById('wordCount');
const saveStatus = document.getElementById('saveStatus');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const commandPalette = document.getElementById('commandPalette');
const commandInput = document.getElementById('commandInput');
const commandList = document.getElementById('commandList');

/**
 * Initialize the application
 */
function initApp() {
    // Load documents from localStorage
    loadDocumentsFromStorage();
    
    // Initialize document, update UI
    updateEditorContent();
    updateWordCount();
    populateDocumentList();
    
    // Setup event listeners
    setupEventListeners();
    
    // Register service worker for offline support
    registerServiceWorker();
    
    // Start autosave
    startAutoSave();
    
    // Apply saved theme preference
    applyThemePreference();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Editor events
    editor.addEventListener('input', handleEditorInput);
    editor.addEventListener('mouseup', handleTextSelection);
    editor.addEventListener('keyup', handleTextSelection);
    
    // Document title events
    documentTitle.addEventListener('change', handleTitleChange);
    
    // Toolbar button events
    document.getElementById('btn-bold').addEventListener('click', () => formatText('bold'));
    document.getElementById('btn-italic').addEventListener('click', () => formatText('italic'));
    document.getElementById('btn-underline').addEventListener('click', () => formatText('underline'));
    document.getElementById('btn-heading').addEventListener('click', () => formatText('h1'));
    document.getElementById('btn-quote').addEventListener('click', () => formatText('quote'));
    document.getElementById('btn-code').addEventListener('click', () => formatText('code'));
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    document.getElementById('btn-zen').addEventListener('click', toggleZenMode);
    document.getElementById('btn-save').addEventListener('click', saveDocument);
    
    // Export options
    document.getElementById('export-pdf').addEventListener('click', exportAsPDF);
    document.getElementById('export-md').addEventListener('click', exportAsMarkdown);
    document.getElementById('export-wdoc').addEventListener('click', exportAsWDOC);
    
    // Floating toolbar format buttons
    const formatButtons = formatToolbar.querySelectorAll('button');
    formatButtons.forEach(button => {
        button.addEventListener('click', () => {
            formatText(button.getAttribute('data-format'));
        });
    });
    
    // Sidebar toggle for mobile
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    
    // New document button
    document.getElementById('newDoc').addEventListener('click', createNewDocument);
    
    // Document click handler (to hide floating toolbar)
    document.addEventListener('click', (e) => {
        if (!editor.contains(e.target) && !formatToolbar.contains(e.target)) {
            formatToolbar.style.display = 'none';
        }
        
        // Close command palette if clicking outside
        if (!commandPalette.contains(e.target) && commandPalette.style.display === 'block') {
            commandPalette.style.display = 'none';
            wordlite.commandPaletteOpen = false;
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Command palette input
    commandInput.addEventListener('input', filterCommands);
    commandInput.addEventListener('keydown', navigateCommandsList);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    // Command palette
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
    }
    
    // Command palette is open - handle Escape to close
    if (wordlite.commandPaletteOpen) {
        if (e.key === 'Escape') {
            commandPalette.style.display = 'none';
            wordlite.commandPaletteOpen = false;
            return;
        }
        return; // Don't process other shortcuts when command palette is open
    }
    
    // Format shortcuts
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                formatText('bold');
                break;
            case 'i':
                e.preventDefault();
                formatText('italic');
                break;
            case 'u':
                e.preventDefault();
                formatText('underline');
                break;
            case 's':
                e.preventDefault();
                saveDocument();
                break;
            case 'e':
                e.preventDefault();
                toggleZenMode();
                break;
        }
    }
    
    // Toggle dark theme
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleTheme();
    }
}

/**
 * Toggle the command palette
 */
function toggleCommandPalette() {
    wordlite.commandPaletteOpen = !wordlite.commandPaletteOpen;
    
    if (wordlite.commandPaletteOpen) {
        // Populate and show command palette
        populateCommandList();
        commandPalette.style.display = 'block';
        commandInput.value = '';
        commandInput.focus();
    } else {
        commandPalette.style.display = 'none';
    }
}

/**
 * Populate the command list
 */
function populateCommandList(filter = '') {
    commandList.innerHTML = '';
    
    const filteredCommands = wordlite.commands.filter(cmd => 
        cmd.name.toLowerCase().includes(filter.toLowerCase())
    );
    
    filteredCommands.forEach(cmd => {
        const item = document.createElement('div');
        item.className = 'command-item';
        item.innerHTML = `
            <span>${cmd.name}</span>
            <span class="shortcut">${cmd.shortcut}</span>
        `;
        item.addEventListener('click', () => {
            cmd.action();
            commandPalette.style.display = 'none';
            wordlite.commandPaletteOpen = false;
        });
        commandList.appendChild(item);
    });
}

/**
 * Filter commands based on input
 */
function filterCommands() {
    populateCommandList(commandInput.value);
}

/**
 * Navigate command list with arrow keys
 */
function navigateCommandsList(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        const items = commandList.querySelectorAll('.command-item');
        if (items.length === 0) return;
        
        // Find currently focused item
        const focusedItem = commandList.querySelector('.command-item:focus');
        let index = -1;
        
        if (focusedItem) {
            // Get index of currently focused item
            Array.from(items).forEach((item, i) => {
                if (item === focusedItem) index = i;
            });
        }
        
        // Calculate new index
        if (e.key === 'ArrowDown') {
            index = (index + 1) % items.length;
        } else {
            index = (index - 1 + items.length) % items.length;
        }
        
        // Focus the new item
        items[index].focus();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        
        // Execute focused command
        const focusedItem = commandList.querySelector('.command-item:focus');
        if (focusedItem) {
            focusedItem.click();
        } else {
            // Execute first command if nothing is focused
            const firstItem = commandList.querySelector('.command-item');
            if (firstItem) firstItem.click();
        }
    }
}

/**
 * Toggle Zen Mode
 */
function toggleZenMode() {
    wordlite.isZenMode = !wordlite.isZenMode;
    document.querySelector('.app').classList.toggle('zen-mode', wordlite.isZenMode);
    
    // If entering zen mode, focus editor
    if (wordlite.isZenMode) {
        editor.focus();
    }
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    wordlite.isThemeDark = !wordlite.isThemeDark;
    document.documentElement.setAttribute('data-theme', wordlite.isThemeDark ? 'dark' : 'light');
    localStorage.setItem('wordlite-theme', wordlite.isThemeDark ? 'dark' : 'light');
}

/**
 * Apply saved theme preference
 */
function applyThemePreference() {
    const savedTheme = localStorage.getItem('wordlite-theme');
    if (savedTheme) {
        wordlite.isThemeDark = savedTheme === 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Check for system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            wordlite.isThemeDark = true;
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
}

/**
 * Handle text selection and show/position the formatting toolbar
 */
function handleTextSelection() {
    const selection = window.getSelection();
    
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Only show the toolbar if text is selected within the editor
    if (selection.toString().trim() === '' || !editor.contains(range.commonAncestorContainer)) {
        formatToolbar.style.display = 'none';
        return;
    }
    
    // Get position for the toolbar
    const rect = range.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    
    // Position toolbar above the selection
    formatToolbar.style.top = `${rect.top - formatToolbar.offsetHeight - 10 + window.scrollY}px`;
    formatToolbar.style.left = `${(rect.left + rect.right) / 2 - formatToolbar.offsetWidth / 2 + window.scrollX}px`;
    formatToolbar.style.display = 'block';
    
    // Update active states for formatting buttons
    updateFormatButtonStates();
}

/**
 * Update the active states of formatting buttons based on current selection
 */
function updateFormatButtonStates() {
    const buttons = formatToolbar.querySelectorAll('button');
    buttons.forEach(button => {
        const format = button.getAttribute('data-format');
        button.classList.toggle('active', document.queryCommandState(format));
    });
}

/**
 * Apply formatting to selected text
 */
function formatText(format) {
    // Save selection
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // Focus the editor
    editor.focus();
    
    // Apply formatting based on command
    switch (format) {
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'italic':
            document.execCommand('italic', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
        case 'h1':
            document.execCommand('formatBlock', false, '<h1>');
            break;
        case 'h2':
            document.execCommand('formatBlock', false, '<h2>');
            break;
        case 'quote':
            document.execCommand('formatBlock', false, '<blockquote>');
            break;
        case 'code':
            // Check if we're in a pre block already
            const parentPre = getClosestElement(range.commonAncestorContainer, 'PRE');
            
            if (parentPre) {
                // Remove pre block
                const textContent = parentPre.textContent;
                const textNode = document.createTextNode(textContent);
                parentPre.parentNode.replaceChild(textNode, parentPre);
            } else {
                // Check if we're wrapping inline or block
                if (selection.toString().includes('\n')) {
                    // Block code
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
