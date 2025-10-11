// ==UserScript==
// @name         Pinterest Image Batch Saver (No ZIP - Direct Download)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Batch download Pinterest images directly without ZIP (thumbnails and originals) with selective download
// @author       karminski-牙医
// @match        https://*.pinterest.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @connect      i.pinimg.com
// ==/UserScript==

(function() {
    'use strict';

    // SVG Logo
    const LOGO_SVG = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="40px" height="40px" viewBox="0 0 32 32" xml:space="preserve">
<style type="text/css">
    .pictogram_een{fill:#F4D6B0;}
    .pictogram_twee{fill:#F8AD89;}
    .pictogram_vier{fill:#E54D2E;}
    .pictogram_vijf{fill:#01A59C;}
    .pictogram_zes{fill:#0C6667;}
</style>
<g>
    <path class="pictogram_twee" d="M32,29c0,1.65-1.35,3-3,3H3c-1.65,0-3-1.35-3-3V3c0-1.65,1.35-3,3-3h26c1.65,0,3,1.35,3,3V29z"/>
    <path class="pictogram_een" d="M29,0H16v32h13c1.65,0,3-1.35,3-3V3C32,1.35,30.65,0,29,0z"/>
    <path class="pictogram_zes" d="M5,7.5c0-1.105,0.895-2,2-2s2,0.895,2,2c0,1.105-0.895,2-2,2S5,8.605,5,7.5z M16,9.5c1.105,0,2-0.895,2-2c0-1.105-0.895-2-2-2s-2,0.895-2,2C14,8.605,14.895,9.5,16,9.5z M21,15v8c0,1.65-1.35,3-3,3h-4v3c0,1.65-1.44,3-3.2,3H9.2C7.44,32,6,30.65,6,29v-3H4c-1.65,0-3-1.35-3-3v-8c0-1.603,1.277-2.926,2.862-3c0.047-0.002,0.09,0,0.138,0c0,0,14.624-0.094,14.914,0C20.118,12.391,21,13.671,21,15z M9,16c0-1.105-0.895-2-2-2s-2,0.895-2,2c0,1.105,0.895,2,2,2S9,17.105,9,16z M25,15.917v4.619L31,24V12.453L25,15.917z"/>
    <path class="pictogram_vijf" d="M1.5,7.5C1.5,4.462,3.962,2,7,2c1.862,0,3.505,0.928,4.5,2.344C12.495,2.928,14.138,2,16,2c3.038,0,5.5,2.462,5.5,5.5c0,1.905-0.976,3.572-2.447,4.559c-0.047-0.018-0.091-0.044-0.138-0.059c-0.127-0.041-2.988-0.046-6.171-0.039c-0.477-0.359-0.901-0.819-1.243-1.305c-0.344,0.489-0.771,0.953-1.252,1.312C6.964,11.981,4,12,4,12c-0.047,0-0.091-0.002-0.138,0c-0.005,0-0.01,0.002-0.015,0.002C2.43,11.008,1.5,9.364,1.5,7.5z M14,7.5c0,1.105,0.895,2,2,2s2-0.895,2-2c0-1.105-0.895-2-2-2S14,6.395,14,7.5z M5,7.5c0,1.105,0.895,2,2,2s2-0.895,2-2c0-1.105-0.895-2-2-2S5,6.395,5,7.5z M25,15h-4v8h4V15z"/>
    <circle class="pictogram_vier" cx="7" cy="16" r="2"/>
</g>
</svg>`;

    // Global state
    let isPanelOpen = false;
    let isSelectionMode = false;
    let selectedImages = new Set();
    let allImages = [];
    let imageIdSet = new Set(); // Add: persistent set to track loaded image IDs
    let scrollTimer = null; // Add: timer for scroll debounce
    let selectionOverlays = new Map(); // Map to track selection overlays

    // Simple hash function
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    // Extract images (incremental mode)
    function extractImages() {
        console.log('[Pinterest Saver] 🔍 Extracting images...');
        const imageElements = document.querySelectorAll('img.hCL[srcset]');
        let newCount = 0;

        imageElements.forEach(img => {
            const srcset = img.getAttribute('srcset');
            if (!srcset) return;

            const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
            const originalUrl = urls[urls.length - 1];
            const thumbnailUrl = img.src;
            const signature = img.closest('[data-test-image-signature]')?.getAttribute('data-test-image-signature');
            const uniqueId = signature || simpleHash(originalUrl);

            // Check if this image ID already exists in our set
            if (!imageIdSet.has(uniqueId)) {
                imageIdSet.add(uniqueId);
                
                const urlParts = originalUrl.split('/');
                const filename = urlParts[urlParts.length - 1];

                allImages.push({
                    id: uniqueId,
                    thumbnailUrl,
                    originalUrl,
                    filename,
                    element: img
                });
                
                newCount++;
            }
        });

        console.log(`[Pinterest Saver] ✅ Found ${newCount} new images (Total: ${allImages.length})`);
        return newCount;
    }

    // Download using GM_download
    function directDownload(url, filename, folder = '') {
        return new Promise((resolve, reject) => {
            const finalFilename = folder ? `${folder}_${filename}` : filename;
            console.log(`[Pinterest Saver] 📥 Downloading: ${finalFilename}`);
            
            GM_download({
                url: url,
                name: finalFilename,
                saveAs: false,  // Auto download
                onerror: function(error) {
                    console.error(`[Pinterest Saver] ❌ Download failed: ${finalFilename}`, error);
                    reject(error);
                },
                onload: function() {
                    console.log(`[Pinterest Saver] ✅ Downloaded: ${finalFilename}`);
                    resolve();
                },
                ontimeout: function() {
                    console.warn(`[Pinterest Saver] ⏱️ Timeout: ${finalFilename}`);
                    reject(new Error('Timeout'));
                }
            });
        });
    }

    // Download all images
    async function downloadAll() {
        if (allImages.length === 0) {
            alert('No images found!');
            return;
        }

        console.log(`[Pinterest Saver] 🚀 Starting direct download of ${allImages.length} images...`);
        alert(`Starting download of ${allImages.length} images.\nFiles will be downloaded individually.\nThis may trigger multiple download prompts.`);

        let completed = 0;
        let failed = 0;

        for (let i = 0; i < allImages.length; i++) {
            const imgData = allImages[i];
            updateProgress(i + 1, allImages.length, `Downloading ${i + 1}/${allImages.length}...`);

            // Download thumbnail
            try {
                await directDownload(imgData.thumbnailUrl, imgData.filename, 'thumb');
                completed++;
            } catch (e) {
                failed++;
            }

            await new Promise(resolve => setTimeout(resolve, 300)); // Delay

            // Download original
            try {
                await directDownload(imgData.originalUrl, imgData.filename, 'orig');
                completed++;
            } catch (e) {
                failed++;
            }

            await new Promise(resolve => setTimeout(resolve, 300));
        }

        alert(`Download complete!\nSuccessful: ${completed}\nFailed: ${failed}`);
        updateProgress(0, 0, 'Complete');
    }

    // Download selected images
    async function downloadSelected() {
        if (selectedImages.size === 0) {
            alert('No images selected!');
            return;
        }

        const imagesToDownload = allImages.filter(img => selectedImages.has(img.id));
        console.log(`[Pinterest Saver] 🚀 Starting download of ${imagesToDownload.length} selected images...`);
        alert(`Starting download of ${imagesToDownload.length} selected images.\nFiles will be downloaded individually.`);

        let completed = 0;
        let failed = 0;

        for (let i = 0; i < imagesToDownload.length; i++) {
            const imgData = imagesToDownload[i];
            updateProgress(i + 1, imagesToDownload.length, `Downloading ${i + 1}/${imagesToDownload.length}...`);

            // Download thumbnail
            try {
                await directDownload(imgData.thumbnailUrl, imgData.filename, 'thumb');
                completed++;
            } catch (e) {
                failed++;
            }

            await new Promise(resolve => setTimeout(resolve, 300));

            // Download original
            try {
                await directDownload(imgData.originalUrl, imgData.filename, 'orig');
                completed++;
            } catch (e) {
                failed++;
            }

            await new Promise(resolve => setTimeout(resolve, 300));
        }

        alert(`Download complete!\nSuccessful: ${completed}\nFailed: ${failed}`);
        updateProgress(0, 0, 'Complete');
        exitSelectionMode();
    }

    // Update progress
    function updateProgress(current, total, text = '') {
        const progressContainer = document.getElementById('progress-container');
        if (!progressContainer) return;

        if (total === 0) {
            progressContainer.style.display = 'none';
            return;
        }

        progressContainer.style.display = 'block';
        document.getElementById('progress-text').textContent = text;
        document.getElementById('progress-count').textContent = `${current}/${total}`;
        document.getElementById('progress-bar').style.width = `${(current / total) * 100}%`;
    }

    // Enter selection mode
    function enterSelectionMode() {
        isSelectionMode = true;
        selectedImages.clear();
        
        // Update UI
        updateSelectionUI();
        
        // Add selection overlays to all images
        allImages.forEach(imgData => {
            addSelectionOverlay(imgData);
        });
        
        console.log('[Pinterest Saver] 🎯 Entered selection mode');
    }

    // Exit selection mode
    function exitSelectionMode() {
        isSelectionMode = false;
        selectedImages.clear();
        
        // Remove all overlays
        selectionOverlays.forEach(overlay => {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
        selectionOverlays.clear();
        
        // Update UI
        updateSelectionUI();
        
        console.log('[Pinterest Saver] 🎯 Exited selection mode');
    }

    // Add selection overlay to image
    function addSelectionOverlay(imgData) {
        const img = imgData.element;
        if (!img || !img.parentNode) return;
        
        // Check if overlay already exists
        if (selectionOverlays.has(imgData.id)) return;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'pinterest-saver-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.3);
            cursor: pointer;
            z-index: 9999;
            transition: background 0.2s;
        `;
        
        // Create checkbox
        const checkbox = document.createElement('div');
        checkbox.className = 'pinterest-saver-checkbox';
        checkbox.style.cssText = `
            width: 40px;
            height: 40px;
            border: 3px solid white;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        `;
        
        // Create checkmark
        const checkmark = document.createElement('div');
        checkmark.style.cssText = `
            width: 24px;
            height: 24px;
            background: #e60023;
            border-radius: 50%;
            display: none;
        `;
        
        checkbox.appendChild(checkmark);
        overlay.appendChild(checkbox);
        
        // Handle click
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (selectedImages.has(imgData.id)) {
                selectedImages.delete(imgData.id);
                checkmark.style.display = 'none';
                overlay.style.background = 'rgba(0, 0, 0, 0.3)';
            } else {
                selectedImages.add(imgData.id);
                checkmark.style.display = 'block';
                overlay.style.background = 'rgba(230, 0, 35, 0.3)';
            }
            
            updateSelectedCount();
        });
        
        // Position overlay relative to image
        const imgContainer = img.closest('[data-test-id="pinWrapper"]') || img.parentNode;
        if (imgContainer) {
            const originalPosition = window.getComputedStyle(imgContainer).position;
            if (originalPosition === 'static') {
                imgContainer.style.position = 'relative';
            }
            imgContainer.appendChild(overlay);
            selectionOverlays.set(imgData.id, overlay);
        }
    }

    // Update selected count display
    function updateSelectedCount() {
        const countElement = document.getElementById('selected-count');
        if (countElement) {
            countElement.textContent = selectedImages.size;
        }
    }

    // Update selection mode UI
    function updateSelectionUI() {
        const selectionInfo = document.getElementById('selection-info');
        const normalButtons = document.getElementById('normal-buttons');
        const selectionButtons = document.getElementById('selection-buttons');
        
        if (isSelectionMode) {
            if (selectionInfo) selectionInfo.style.display = 'block';
            if (normalButtons) normalButtons.style.display = 'none';
            if (selectionButtons) selectionButtons.style.display = 'block';
            updateSelectedCount();
        } else {
            if (selectionInfo) selectionInfo.style.display = 'none';
            if (normalButtons) normalButtons.style.display = 'block';
            if (selectionButtons) selectionButtons.style.display = 'none';
        }
    }

    // Create UI
    function createFloatingButton() {
        const button = document.createElement('div');
        button.id = 'pinterest-saver-btn';
        button.innerHTML = LOGO_SVG;
        button.style.cssText = `
            position: fixed; top: 80px; right: 6px; width: 50px; height: 50px;
            cursor: pointer; z-index: 99999; transition: all 0.3s ease;
            filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
        `;
        button.addEventListener('click', togglePanel);
        document.body.appendChild(button);
    }

    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'pinterest-saver-panel';
        panel.style.cssText = `
            position: fixed; top: 80px; right: 6px; width: 320px;
            background: #1e1e1e; border-radius: 16px; padding: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4); z-index: 99998; display: none;
            color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #e60023;">Image Saver</h3>
                <div id="pinterest-saver-mini-logo" style="width: 30px; height: 30px; cursor: pointer;">${LOGO_SVG}</div>
            </div>
            
            <!-- Selection Info (Hidden by default) -->
            <div id="selection-info" style="display: none; margin-bottom: 15px; padding: 10px; background: #2a2a2a; border-radius: 8px; border: 2px solid #e60023;">
                <div style="font-size: 14px; color: #b0b0b0; margin-bottom: 5px;">Selected Images</div>
                <div id="selected-count" style="font-size: 24px; font-weight: 600; color: #e60023;">0</div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="font-size: 14px; color: #b0b0b0; margin-bottom: 5px;">Images Found</div>
                <div id="image-count" style="font-size: 24px; font-weight: 600; color: #e60023;">0</div>
            </div>
            <div id="progress-container" style="display: none; margin-bottom: 15px;">
                <div style="font-size: 12px; color: #b0b0b0; margin-bottom: 5px;">
                    <span id="progress-text">Downloading...</span>
                    <span id="progress-count" style="float: right;">0/0</span>
                </div>
                <div style="width: 100%; height: 6px; background: #333; border-radius: 3px; overflow: hidden;">
                    <div id="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #e60023, #ff4444); transition: width 0.3s;"></div>
                </div>
            </div>
            
            <!-- Normal Mode Buttons -->
            <div id="normal-buttons">
                <button id="refresh-btn" style="width: 100%; padding: 12px; margin-bottom: 10px; background: #333; color: #e0e0e0; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">🔄 Refresh Images</button>
                <button id="enter-selection-btn" style="width: 100%; padding: 12px; margin-bottom: 10px; background: #0077cc; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">✓ Select Images</button>
                <button id="clear-cache-btn" style="width: 100%; padding: 12px; margin-bottom: 10px; background: #444; color: #e0e0e0; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">🗑️ Clear Cache</button>
                <button id="download-all-btn" style="width: 100%; padding: 12px; margin-bottom: 10px; background: #e60023; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">⬇️ Download All</button>
            </div>
            
            <!-- Selection Mode Buttons (Hidden by default) -->
            <div id="selection-buttons" style="display: none;">
                <button id="download-selected-btn" style="width: 100%; padding: 12px; margin-bottom: 10px; background: #e60023; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">⬇️ Download Selected</button>
                <button id="exit-selection-btn" style="width: 100%; padding: 12px; margin-bottom: 10px; background: #666; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">✕ Exit Selection Mode</button>
            </div>
            
            <!-- Project Link -->
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #333; text-align: center;">
                <a href="https://github.com/karminski/pintrest-image-saver/" target="_blank" style="color: #888; font-size: 12px; text-decoration: none; transition: color 0.2s;">
                    📦 Project on GitHub
                </a>
            </div>
        `;

        document.body.appendChild(panel);
        document.getElementById('pinterest-saver-mini-logo').addEventListener('click', togglePanel);
        document.getElementById('refresh-btn').addEventListener('click', refreshImages);
        document.getElementById('enter-selection-btn').addEventListener('click', enterSelectionMode);
        document.getElementById('clear-cache-btn').addEventListener('click', clearCache);
        document.getElementById('download-all-btn').addEventListener('click', downloadAll);
        document.getElementById('download-selected-btn').addEventListener('click', downloadSelected);
        document.getElementById('exit-selection-btn').addEventListener('click', exitSelectionMode);
    }

    function togglePanel() {
        isPanelOpen = !isPanelOpen;
        const panel = document.getElementById('pinterest-saver-panel');
        const button = document.getElementById('pinterest-saver-btn');

        if (isPanelOpen) {
            panel.style.display = 'block';
            button.style.transform = 'scale(0.6)';
            button.style.top = '105px';  // 80px + 25px (向下移动25px)
            button.style.right = '6px';  // 保持原位，或者如果想向右移可以减小这个值
            button.style.opacity = '0';  // 让原图标消失
            button.style.visibility = 'hidden';  // 完全隐藏原图标
            refreshImages();
        } else {
            panel.style.display = 'none';
            button.style.transform = 'scale(1)';
            button.style.top = '80px';
            button.style.right = '6px';
            button.style.opacity = '1';  // 恢复显示
            button.style.visibility = 'visible';  // 恢复可见
        }
    }

    function refreshImages() {
        const newCount = extractImages();
        document.getElementById('image-count').textContent = allImages.length;
        
        // Show notification if new images are found
        if (newCount > 0) {
            console.log(`[Pinterest Saver] 🎉 Added ${newCount} new images`);
        }
    }
    
    // Scroll handler with debounce
    function handleScroll() {
        // Clear previous timer
        if (scrollTimer) {
            clearTimeout(scrollTimer);
        }
        
        // Set new timer - execute after 500ms of no scrolling
        scrollTimer = setTimeout(() => {
            console.log('[Pinterest Saver] 📜 Scroll detected, checking for new images...');
            refreshImages();
        }, 500);
    }
    
    // Clear all cached images
    function clearCache() {
        // Exit selection mode if active
        if (isSelectionMode) {
            exitSelectionMode();
        }
        
        allImages = [];
        imageIdSet.clear();
        selectedImages.clear();
        selectionOverlays.clear();
        document.getElementById('image-count').textContent = '0';
        console.log('[Pinterest Saver] 🗑️ Cache cleared');
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        console.log('[Pinterest Saver] 🎬 Initializing (Direct Download Mode)...');
        createFloatingButton();
        createPanel();
        
        // Add scroll listener to detect new images
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        console.log('[Pinterest Saver] ✅ Ready! No ZIP - files will download individually.');
        console.log('[Pinterest Saver] 📜 Scroll listener activated');
    }

    init();
})();

