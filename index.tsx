import { GoogleGenAI } from "@google/genai";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as THREE from 'three';

const storyForm = document.getElementById('story-form') as HTMLFormElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const storyContainer = document.querySelector('.story-container') as HTMLDivElement;
const storyOutput = document.getElementById('story-output') as HTMLDivElement;
const editorToolbar = document.getElementById('editor-toolbar') as HTMLDivElement;
const storyActions = document.getElementById('story-actions') as HTMLDivElement;

const addCharacterBtn = document.getElementById('add-character-btn') as HTMLButtonElement;
const characterInputsContainer = document.getElementById('character-inputs') as HTMLDivElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const downloadPdfBtn = document.getElementById('download-pdf-btn') as HTMLButtonElement;
const startOverBtn = document.getElementById('start-over-btn') as HTMLButtonElement;
const rewriteBtn = document.getElementById('rewrite-btn') as HTMLButtonElement;


const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  storyOutput.innerHTML = `<div class="error-message">API key is not set. Please configure your environment.</div>`;
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

let characterCount = 1;
const MAX_CHARACTERS = 5;
const RTL_LANGUAGES = ['Urdu', 'Arabic'];


const showLoading = () => {
  storyOutput.innerHTML = `
    <div class="loader"></div>
    <p class="loading-text">Our AI is weaving your tale...</p>
  `;
  editorToolbar.classList.add('hidden');
  storyActions.classList.add('hidden');
  storyContainer.className = 'story-container card'; // Reset classes
  storyOutput.setAttribute('contenteditable', 'false');

  generateBtn.disabled = true;
  generateBtn.querySelector('span')!.textContent = 'Generating...';
  rewriteBtn.classList.add('hidden');
};

const showError = (message: string) => {
  storyOutput.innerHTML = `<div class="error-message">${message}</div>`;
  generateBtn.disabled = false;
  generateBtn.querySelector('span')!.textContent = 'Generate My Story';
};

const finalizeStoryUI = (language: string) => {
    storyContainer.classList.add('story-generated');
    
    // Reset language-specific classes before adding new ones
    storyContainer.classList.remove('rtl-text', 'lang-ur', 'lang-ar');
    
    if (RTL_LANGUAGES.includes(language)) {
        storyContainer.classList.add('rtl-text');
    }

    if (language === 'Urdu') {
        storyContainer.classList.add('lang-ur');
    } else if (language === 'Arabic') {
        storyContainer.classList.add('lang-ar');
    }

    editorToolbar.classList.remove('hidden');
    storyActions.classList.remove('hidden');
    rewriteBtn.classList.remove('hidden');
    storyOutput.setAttribute('contenteditable', 'true');
};


const handleFormSubmit = async (e: Event) => {
  e.preventDefault();
  if (!API_KEY) {
      showError("API Key is missing. Please check your configuration.");
      return;
  }

  showLoading();

  const formData = new FormData(storyForm);
  const theme = formData.get('theme') as string;
  const setting = formData.get('setting') as string;
  const genre = formData.get('genre') as string;
  const language = formData.get('language') as string;
  const audience = formData.get('audience') as string;
  const writingStyle = formData.get('writing-style') as string;
  const wordLimit = formData.get('word-limit') as string;
  const additionalDetails = formData.get('additional-details') as string;

  const characters = [];
  for (let i = 1; i <= MAX_CHARACTERS; i++) {
    const charName = formData.get(`character-${i}`) as string;
    if (charName) {
      characters.push(charName);
    }
  }

  let prompt = `
    You are an expert storyteller, celebrated for your creative and engaging narratives. Write a complete and compelling story in ${language}.
    - Genre: ${genre}
    - Theme: ${theme}
    - Setting: ${setting}
    - Main Characters: ${characters.join(', ')}. Ensure they have distinct personalities and motivations.
    - Target Audience: ${audience}
    - Desired Writing Style: ${writingStyle}. This is crucial. The tone and prose must reflect this style.
    ${wordLimit ? `- The story must be approximately ${wordLimit} words long.` : ''}
    ${additionalDetails ? `- Additional Details to incorporate: ${additionalDetails}` : ''}

    Please structure the story with a clear beginning, a rising action, a climax, a falling action, and a satisfying resolution.
    Give it emotional depth and use vivid imagery.

    Format the final output as a single block of clean HTML.
    1. Start with a creative and relevant title inside an <h1> tag.
    2. The main story text should follow, carefully formatted into paragraphs using <p> tags.
    3. You may use <h2> tags for chapter or section headings if it enhances the story's structure.
    4. VERY IMPORTANT: Do not include any markdown like \`\`\`html or \`\`\` at the beginning or end of your response. Only return the raw HTML content.
  `;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    storyOutput.innerHTML = '';
    let fullStory = '';
    
    for await (const chunk of responseStream) {
        fullStory += chunk.text;
        storyOutput.innerHTML = fullStory;
        storyOutput.scrollTop = storyOutput.scrollHeight;
    }
    
    finalizeStoryUI(language);

  } catch (error) {
    console.error(error);
    showError("An error occurred while generating the story. Please try again.");
  } finally {
    generateBtn.disabled = false;
    generateBtn.querySelector('span')!.textContent = 'Generate My Story';
  }
};

const handleRewriteStory = async () => {
    if (!API_KEY) {
        showError("API Key is missing. Please check your configuration.");
        return;
    }

    const currentText = storyOutput.innerText;
    if (!currentText.trim()) {
        showError("There is no story to rewrite.");
        return;
    }
    
    const language = (document.getElementById('language') as HTMLSelectElement).value;

    showLoading();
    generateBtn.disabled = false;
    generateBtn.querySelector('span')!.textContent = 'Generate My Story';


    const prompt = `
        You are a professional editor with a talent for enhancing narratives. Rewrite the following story to improve its style, flow, and emotional impact, while keeping the core plot and characters the same. The rewritten story must be in ${language}.
        Focus on improving imagery, pacing, and dialogue.
        
        Original Story:
        "${currentText}"

        Format the response as a single block of clean HTML.
        1. Provide a creative title inside an <h1> tag.
        2. The story text should follow, formatted into paragraphs using <p> tags.
        3. You may use <h2> tags for section headings if appropriate.
        4. VERY IMPORTANT: Do not include any markdown like \`\`\`html or \`\`\` at the beginning or end of your response. Only return the raw HTML content.
    `;

    try {
        const responseStream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        storyOutput.innerHTML = '';
        let fullStory = '';

        for await (const chunk of responseStream) {
            fullStory += chunk.text;
            storyOutput.innerHTML = fullStory;
            storyOutput.scrollTop = storyOutput.scrollHeight;
        }

        finalizeStoryUI(language);

    } catch (error) {
        console.error(error);
        showError("An error occurred while rewriting the story. Please try again.");
    }
};


const addCharacterInput = () => {
  const currentInputs = characterInputsContainer.querySelectorAll('.character-field-group').length;
  if (currentInputs >= MAX_CHARACTERS) return;
  
  characterCount = currentInputs + 1;

  const group = document.createElement('div');
  group.className = 'character-field-group';

  const inputGroup = document.createElement('div');
  inputGroup.className = 'input-group icon-input';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.id = `character-${characterCount}`;
  input.name = `character-${characterCount}`;
  input.placeholder = `Character Name ${characterCount}`;
  
  const icon = document.createElement('span');
  icon.className = 'input-icon user-icon';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-character-btn';
  removeBtn.setAttribute('aria-label', 'Remove character');
  removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>`;
  
  removeBtn.addEventListener('click', () => {
    group.remove();
    addCharacterBtn.disabled = characterInputsContainer.querySelectorAll('.character-field-group').length >= MAX_CHARACTERS;
  });

  inputGroup.appendChild(input);
  inputGroup.appendChild(icon);
  group.appendChild(inputGroup);
  group.appendChild(removeBtn);
  characterInputsContainer.appendChild(group);

  if (characterInputsContainer.querySelectorAll('.character-field-group').length >= MAX_CHARACTERS) {
    addCharacterBtn.disabled = true;
  }
};

const copyStory = () => {
    const textToCopy = storyOutput.innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = copyBtn.querySelector('span')!.textContent;
        const originalIcon = copyBtn.querySelector('svg')!.outerHTML;
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path></svg> <span>Copied!</span>`;
        setTimeout(() => { copyBtn.innerHTML = `${originalIcon} <span>${originalText}</span>`; }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
};


const downloadStoryAsPdf = async () => {
    const originalContent = downloadPdfBtn.innerHTML;
    downloadPdfBtn.innerHTML = `<svg class="spinning-icon" viewBox="0 0 24 24"><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"></path></svg> <span>Saving...</span>`;
    downloadPdfBtn.disabled = true;

    // Create a temporary, off-screen container for rendering to avoid issues with contenteditable
    const printableArea = document.createElement('div');
    document.body.appendChild(printableArea);

    printableArea.innerHTML = storyOutput.innerHTML;
    
    // Set styles for the printable area to mimic PDF layout
    Object.assign(printableArea.style, {
        width: '718px', // Approx width for A4 with margins
        padding: '20px',
        backgroundColor: '#ffffff',
        color: '#333',
        fontFamily: getComputedStyle(storyOutput).fontFamily,
        fontSize: getComputedStyle(storyOutput).fontSize,
        lineHeight: getComputedStyle(storyOutput).lineHeight,
        position: 'absolute',
        left: '-9999px',
        top: '0',
    });
    
    printableArea.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => (h as HTMLElement).style.color = '#000');
    printableArea.querySelectorAll('p, li, blockquote').forEach(el => (el as HTMLElement).style.color = '#444');

    if (storyContainer.classList.contains('lang-ur')) {
        const urduStyles = { fontFamily: "'Jameel Noori Nastaleeq', sans-serif", fontSize: '1.2rem', lineHeight: '2.2', direction: 'rtl', textAlign: 'right' };
        Object.assign(printableArea.style, urduStyles);
        printableArea.querySelectorAll('*').forEach(el => { (el as HTMLElement).style.fontFamily = "'Jameel Noori Nastaleeq', sans-serif"; });
    } else if (storyContainer.classList.contains('lang-ar')) {
        const arabicStyles = { fontFamily: "'Tahoma', 'Arial', sans-serif", fontSize: '1.1rem', lineHeight: '2.0', direction: 'rtl', textAlign: 'right' };
        Object.assign(printableArea.style, arabicStyles);
        printableArea.querySelectorAll('*').forEach(el => { (el as HTMLElement).style.fontFamily = "'Tahoma', 'Arial', sans-serif"; });
    }


    try {
        // Allow images and fonts to load before capturing
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(printableArea, {
            scale: 2,
            useCORS: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const canvasAspectRatio = canvas.height / canvas.width;
        const imgWidth = pdfWidth - 20; // with margin
        const imgHeight = imgWidth * canvasAspectRatio;

        let heightLeft = imgHeight;
        let position = 10; // Top margin

        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);

        while (heightLeft > 0) {
            position = position - (pdfHeight - 20);
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 20);
        }

        pdf.save('story.pdf');
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Could not generate PDF. The story might be too complex or contain unsupported elements.");
    } finally {
        downloadPdfBtn.innerHTML = originalContent;
        downloadPdfBtn.disabled = false;
        document.body.removeChild(printableArea); // Clean up the temporary element
    }
};

const resetApp = () => {
  storyForm.reset();
  characterInputsContainer.innerHTML = `
    <div class="input-group icon-input">
      <input type="text" id="character-1" name="character-1" placeholder="Character Name 1" required>
      <span class="input-icon user-icon"></span>
    </div>
  `;
  characterCount = 1;
  addCharacterBtn.disabled = false;
  
  storyOutput.innerHTML = '<div class="placeholder"><p>Your generated story will appear here.</p></div>';
  editorToolbar.classList.add('hidden');
  storyActions.classList.add('hidden');
  rewriteBtn.classList.add('hidden');
  storyContainer.className = 'story-container card'; // Reset classes
  storyOutput.setAttribute('contenteditable', 'false');

  generateBtn.disabled = false;
  generateBtn.querySelector('span')!.textContent = 'Generate My Story';
};

// --- EDITOR LOGIC & HELPERS ---
const rgbToHex = (rgb: string): string => {
    if (!rgb || !rgb.startsWith('rgb')) return '#000000';
    const result = /rgb\((\d+), (\d+), (\d+)\)/.exec(rgb);
    if (!result) return '#000000';
    const r = parseInt(result[1], 10);
    const g = parseInt(result[2], 10);
    const b = parseInt(result[3], 10);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};


const applyStyleToSelection = (style: string, value: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    const getBlockParent = (node: Node | null): HTMLElement | null => {
        while (node) {
            if (node.nodeType === 1 && window.getComputedStyle(node as HTMLElement).display.includes('block')) {
                return node as HTMLElement;
            }
            node = node.parentNode;
        }
        return null;
    };
    
    const startBlock = getBlockParent(range.startContainer);
    const endBlock = getBlockParent(range.endContainer);

    if (startBlock) {
        let currentBlock: HTMLElement | null = startBlock;
        while(currentBlock && currentBlock !== endBlock?.nextElementSibling) {
            (currentBlock.style as any)[style] = value;
             currentBlock = currentBlock.nextElementSibling as HTMLElement | null;
        }
    }
};

const setupEditor = () => {
    const formatBlockSelect = document.getElementById('format-block-select') as HTMLSelectElement;
    const fontFamilySelect = document.getElementById('font-family-select') as HTMLSelectElement;
    const fontSizeSelect = document.getElementById('font-size-select') as HTMLSelectElement;
    const foreColorInput = document.getElementById('fore-color-input') as HTMLInputElement;
    const backColorInput = document.getElementById('back-color-input') as HTMLInputElement;
    const lineSpacingSelect = document.getElementById('line-spacing-select') as HTMLSelectElement;

    const executeCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        storyOutput.focus();
        updateToolbarState();
    };

    editorToolbar.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const toolBtn = target.closest('.tool-btn');
        if (toolBtn) {
            e.preventDefault();
            const command = toolBtn.getAttribute('data-command');
            if (command) {
                executeCommand(command);
            }
        }
    });

    formatBlockSelect.addEventListener('change', () => executeCommand('formatBlock', `<${formatBlockSelect.value}>`));
    fontFamilySelect.addEventListener('change', () => executeCommand('fontName', fontFamilySelect.value));
    fontSizeSelect.addEventListener('change', () => executeCommand('fontSize', fontSizeSelect.value));
    foreColorInput.addEventListener('input', () => executeCommand('foreColor', foreColorInput.value));
    backColorInput.addEventListener('input', () => executeCommand('backColor', backColorInput.value));
    lineSpacingSelect.addEventListener('change', () => {
        applyStyleToSelection('lineHeight', lineSpacingSelect.value);
        storyOutput.focus();
        updateToolbarState();
    });

    storyOutput.addEventListener('keyup', updateToolbarState);
    storyOutput.addEventListener('mouseup', updateToolbarState);
    storyOutput.addEventListener('focus', updateToolbarState);
};

const getSelectionParent = (): HTMLElement | null => {
    const selection = window.getSelection();
    if(!selection || selection.rangeCount === 0) return null;
    let parent = selection.getRangeAt(0).startContainer;
    return (parent.nodeType === 1 ? parent : parent.parentNode) as HTMLElement;
};

const updateToolbarState = () => {
    if (editorToolbar.classList.contains('hidden')) return;
    
    const parentEl = getSelectionParent();
    if (!parentEl) return;
    
    // Update buttons
    const buttons = editorToolbar.querySelectorAll('.tool-btn[data-command]');
    buttons.forEach(btn => {
        const command = btn.getAttribute('data-command');
        try {
            if (command && document.queryCommandState(command)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        } catch (e) {}
    });

    // Update Selects and Inputs
    const formatBlockSelect = document.getElementById('format-block-select') as HTMLSelectElement;
    const fontFamilySelect = document.getElementById('font-family-select') as HTMLSelectElement;
    const fontSizeSelect = document.getElementById('font-size-select') as HTMLSelectElement;
    const foreColorInput = document.getElementById('fore-color-input') as HTMLInputElement;
    const foreColorLabel = foreColorInput.previousElementSibling as HTMLLabelElement;
    const backColorInput = document.getElementById('back-color-input') as HTMLInputElement;
    const backColorLabel = backColorInput.previousElementSibling as HTMLLabelElement;
    const lineSpacingSelect = document.getElementById('line-spacing-select') as HTMLSelectElement;
    
    const block = document.queryCommandValue('formatBlock').toLowerCase() || 'p';
    formatBlockSelect.value = ['h1', 'h2', 'h3', 'blockquote'].includes(block) ? block : 'p';
    
    const font = document.queryCommandValue('fontName').replace(/['"]/g, '');
    fontFamilySelect.value = font || 'Arial';
    
    const size = document.queryCommandValue('fontSize');
    fontSizeSelect.value = size || '3';

    const parentBlock = parentEl.closest('p, h1, h2, h3, div, li');
    const computedStyle = window.getComputedStyle(parentBlock || parentEl);
    
    // Line Spacing
    const lineHeight = parseFloat(computedStyle.lineHeight) / parseFloat(computedStyle.fontSize);
    if (!isNaN(lineHeight)) {
        const options = Array.from(lineSpacingSelect.options).map(opt => parseFloat(opt.value));
        const closest = options.reduce((prev, curr) => (Math.abs(curr - lineHeight) < Math.abs(prev - lineHeight) ? curr : prev));
        lineSpacingSelect.value = closest.toFixed(1);
    } else {
        lineSpacingSelect.value = "1.0"; // Default
    }
    
    // Colors
    const foreColor = document.queryCommandValue('foreColor');
    const backColor = document.queryCommandValue('backColor');
    foreColorInput.value = rgbToHex(foreColor);
    if(foreColorLabel) foreColorLabel.style.borderBottomColor = foreColorInput.value;
    backColorInput.value = rgbToHex(backColor || 'rgb(255, 255, 255)');
    if(backColorLabel) backColorLabel.style.backgroundColor = backColorInput.value;

};

// --- BACKGROUND ANIMATION ---
const initBackgroundAnimation = () => {
    const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particlesGeometry = new THREE.BufferGeometry();
    const count = 5000;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const color1 = new THREE.Color("#ec008c"); // Pink
    const color2 = new THREE.Color("#8e2de2"); // Purple

    for (let i = 0; i < count * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 10;
        
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3 + 0] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.02,
        sizeAttenuation: true,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    camera.position.z = 5;

    const mouse = new THREE.Vector2();
    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    const clock = new THREE.Clock();
    
    const animate = () => {
        const elapsedTime = clock.getElapsedTime();

        particles.rotation.y = elapsedTime * 0.05;
        particles.rotation.x = elapsedTime * 0.02;
        
        // Parallax effect
        camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.02;
        camera.position.y += (mouse.y * 0.5 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
};


// --- EVENT LISTENERS ---
storyForm.addEventListener('submit', handleFormSubmit);
addCharacterBtn.addEventListener('click', addCharacterInput);
rewriteBtn.addEventListener('click', handleRewriteStory);
copyBtn.addEventListener('click', copyStory);
downloadPdfBtn.addEventListener('click', downloadStoryAsPdf);
startOverBtn.addEventListener('click', resetApp);

// --- INITIALIZE APP ---
setupEditor();
initBackgroundAnimation();