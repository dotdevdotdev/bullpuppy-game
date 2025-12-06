import * as THREE from 'three';
import { LIFE_STAGE, GENDER, AGE } from './config.js';

export class UI {
  constructor(dogManager) {
    this.dogManager = dogManager;
    this.selectedDog = null;

    // Callbacks
    this.onBecomeDog = null;
    this.onBabyMaker = null;
    this.onStopBabyMaker = null;

    // Baby maker state
    this.isBabyMakerActive = false;
    this.babyMakerBabyCount = 0;

    this.createToolbar();
    this.createStatusPanel();
    this.createBabyMakerOverlay();
    this.createStyles();
  }

  createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Spawn Toolbar */
      #spawn-toolbar {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        border-radius: 12px;
        padding: 12px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        z-index: 100;
        font-family: system-ui, sans-serif;
      }

      .toolbar-title {
        color: white;
        font-size: 14px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .toolbar-buttons {
        display: flex;
        gap: 8px;
      }

      #spawn-toolbar button {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
      }

      #spawn-toolbar button:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.6);
        transform: translateY(-2px);
      }

      #spawn-toolbar button .icon {
        font-size: 24px;
      }

      #spawn-toolbar button .label {
        color: white;
        font-size: 11px;
      }

      #spawn-toolbar button[data-gender="male"] {
        border-color: rgba(100, 149, 237, 0.5);
      }

      #spawn-toolbar button[data-gender="male"]:hover {
        border-color: rgba(100, 149, 237, 0.9);
      }

      #spawn-toolbar button[data-gender="female"] {
        border-color: rgba(255, 182, 193, 0.5);
      }

      #spawn-toolbar button[data-gender="female"]:hover {
        border-color: rgba(255, 182, 193, 0.9);
      }

      /* Dog Status Panel */
      #dog-status-panel {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 280px;
        background: rgba(0, 0, 0, 0.85);
        border-radius: 12px;
        padding: 16px;
        z-index: 100;
        font-family: system-ui, sans-serif;
        color: white;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }

      #dog-status-panel.hidden {
        display: none;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }

      .dog-name {
        font-size: 18px;
        font-weight: 600;
      }

      .close-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }

      .close-btn:hover {
        color: white;
      }

      .panel-stats {
        margin-bottom: 16px;
      }

      .stat-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .stat-label {
        color: rgba(255, 255, 255, 0.6);
        font-size: 13px;
      }

      .stat-value {
        font-size: 13px;
        font-weight: 500;
      }

      .panel-actions {
        display: flex;
        gap: 8px;
      }

      .action-btn {
        flex: 1;
        background: rgba(100, 149, 237, 0.3);
        border: 2px solid rgba(100, 149, 237, 0.6);
        border-radius: 8px;
        padding: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
      }

      .action-btn:hover {
        background: rgba(100, 149, 237, 0.5);
        border-color: rgba(100, 149, 237, 0.9);
      }

      .action-icon {
        font-size: 18px;
      }

      .action-label {
        color: white;
        font-size: 14px;
        font-weight: 500;
      }

      .action-btn.baby-maker-btn {
        background: rgba(255, 105, 180, 0.3);
        border-color: rgba(255, 105, 180, 0.6);
      }

      .action-btn.baby-maker-btn:hover {
        background: rgba(255, 105, 180, 0.5);
        border-color: rgba(255, 105, 180, 0.9);
      }

      .action-btn.baby-maker-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .action-btn.stop-btn {
        background: rgba(255, 69, 0, 0.4);
        border-color: rgba(255, 69, 0, 0.7);
      }

      .action-btn.stop-btn:hover {
        background: rgba(255, 69, 0, 0.6);
        border-color: rgba(255, 69, 0, 0.9);
      }

      /* Baby maker mode overlay */
      #baby-maker-overlay {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 105, 180, 0.9);
        border-radius: 12px;
        padding: 16px 24px;
        z-index: 150;
        font-family: system-ui, sans-serif;
        color: white;
        text-align: center;
        box-shadow: 0 4px 20px rgba(255, 105, 180, 0.4);
      }

      #baby-maker-overlay.hidden {
        display: none;
      }

      #baby-maker-overlay .baby-count {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 8px;
      }

      #baby-maker-overlay .baby-message {
        font-size: 14px;
        margin-bottom: 12px;
      }

      /* Cursor styles */
      canvas {
        cursor: default;
      }

      canvas.hovering-dog {
        cursor: grab;
      }

      canvas.dragging-dog {
        cursor: grabbing;
      }

      /* Dog mode hint */
      #dog-mode-hint {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        border-radius: 8px;
        padding: 12px 20px;
        z-index: 100;
        font-family: system-ui, sans-serif;
        color: white;
      }

      #dog-mode-hint.hidden {
        display: none;
      }

      .hint-controls {
        display: flex;
        gap: 20px;
        font-size: 13px;
      }

      .hint-controls kbd {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        padding: 2px 6px;
        font-family: monospace;
        margin-right: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'spawn-toolbar';
    toolbar.innerHTML = `
      <div class="toolbar-title">Spawn Dogs</div>
      <div class="toolbar-buttons">
        <button data-stage="puppy" data-gender="male" title="Boy Puppy">
          <span class="icon">🐕</span>
          <span class="label">Boy Puppy</span>
        </button>
        <button data-stage="puppy" data-gender="female" title="Girl Puppy">
          <span class="icon">🐕</span>
          <span class="label">Girl Puppy</span>
        </button>
        <button data-stage="dog" data-gender="male" title="Boy Dog">
          <span class="icon">🐕</span>
          <span class="label">Boy Dog</span>
        </button>
        <button data-stage="dog" data-gender="female" title="Girl Dog">
          <span class="icon">🐕</span>
          <span class="label">Girl Dog</span>
        </button>
        <button data-stage="parent" data-gender="male" title="Daddy">
          <span class="icon">🐕</span>
          <span class="label">Daddy</span>
        </button>
        <button data-stage="parent" data-gender="female" title="Mommy">
          <span class="icon">🐕</span>
          <span class="label">Mommy</span>
        </button>
      </div>
    `;
    document.body.appendChild(toolbar);

    this.setupToolbarListeners();
  }

  setupToolbarListeners() {
    const buttons = document.querySelectorAll('#spawn-toolbar button');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const stage = btn.dataset.stage;
        const gender = btn.dataset.gender;
        this.spawnDog(stage, gender);
      });
    });
  }

  spawnDog(stage, gender) {
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      5, // Drop from above
      (Math.random() - 0.5) * 20
    );

    const dog = this.dogManager.createDog({
      gender: gender === 'male' ? GENDER.MALE : GENDER.FEMALE,
      lifeStage: stage,
      age: stage === 'puppy' ? 0 : (stage === 'dog' ? AGE.MATURITY_AGE : AGE.MATURITY_AGE + 2),
      position: position,
    });

    // Set flying so it falls
    dog.isFlying = true;
    dog.velocity.set(0, 0, 0);
  }

  createStatusPanel() {
    const panel = document.createElement('div');
    panel.id = 'dog-status-panel';
    panel.className = 'hidden';
    panel.innerHTML = `
      <div class="panel-header">
        <span class="dog-name"></span>
        <button class="close-btn">&times;</button>
      </div>
      <div class="panel-stats">
        <div class="stat-row">
          <span class="stat-label">Type</span>
          <span class="stat-value type-value"></span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Gender</span>
          <span class="stat-value gender-value"></span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Age</span>
          <span class="stat-value age-value"></span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Life Duration</span>
          <span class="stat-value life-duration-value"></span>
        </div>
        <div class="stat-row">
          <span class="stat-label">State</span>
          <span class="stat-value state-value"></span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Family</span>
          <span class="stat-value family-value"></span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Mate</span>
          <span class="stat-value mate-value"></span>
        </div>
      </div>
      <div class="panel-actions">
        <button class="action-btn become-dog-btn">
          <span class="action-icon">🎮</span>
          <span class="action-label">Become Dog</span>
        </button>
        <button class="action-btn baby-maker-btn" style="display: none;">
          <span class="action-icon">💕</span>
          <span class="action-label">Baby maker!</span>
        </button>
      </div>
    `;
    document.body.appendChild(panel);

    // Close button
    panel.querySelector('.close-btn').addEventListener('click', () => {
      this.hideStatusPanel();
    });

    // Become dog button
    panel.querySelector('.become-dog-btn').addEventListener('click', () => {
      if (this.selectedDog && this.onBecomeDog) {
        this.onBecomeDog(this.selectedDog);
        this.hideStatusPanel();
      }
    });

    // Baby maker button
    panel.querySelector('.baby-maker-btn').addEventListener('click', () => {
      if (this.selectedDog && this.onBabyMaker) {
        const partner = this.findMateablePartner(this.selectedDog);
        if (partner) {
          this.onBabyMaker(this.selectedDog, partner);
          this.hideStatusPanel();
        }
      }
    });

    this.statusPanel = panel;
  }

  createBabyMakerOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'baby-maker-overlay';
    overlay.className = 'hidden';
    overlay.innerHTML = `
      <div class="baby-count">0 babies!</div>
      <div class="baby-message">Keep circling for more babies...</div>
      <button class="action-btn stop-btn">
        <span class="action-icon">✋</span>
        <span class="action-label">Stop!</span>
      </button>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.stop-btn').addEventListener('click', () => {
      if (this.onStopBabyMaker) {
        this.onStopBabyMaker();
      }
    });

    this.babyMakerOverlay = overlay;
  }

  findMateablePartner(dog) {
    if (!dog.canMate()) {
      console.log(`${dog.getDisplayName()} cannot mate - lifeStage: ${dog.lifeStage}, mate: ${dog.mate ? 'yes' : 'no'}`);
      return null;
    }

    for (const other of this.dogManager.dogs) {
      if (other === dog) continue;
      if (!dog.canMateWith(other)) continue;

      const dist = dog.model.position.distanceTo(other.model.position);
      console.log(`Distance between ${dog.getDisplayName()} and ${other.getDisplayName()}: ${dist.toFixed(1)}`);
      if (dist < 15) { // Within reasonable distance (increased from 10)
        return other;
      }
    }
    console.log(`No mateable partner found within range for ${dog.getDisplayName()}`);
    return null;
  }

  showBabyMakerOverlay(babyCount) {
    this.isBabyMakerActive = true;
    this.babyMakerBabyCount = babyCount;
    this.babyMakerOverlay.querySelector('.baby-count').textContent = `${babyCount} babies!`;

    const minBabies = 3;
    if (babyCount < minBabies) {
      this.babyMakerOverlay.querySelector('.baby-message').textContent = `Keep circling! (need at least ${minBabies})`;
    } else {
      this.babyMakerOverlay.querySelector('.baby-message').textContent = `You can stop now or keep going!`;
    }

    this.babyMakerOverlay.classList.remove('hidden');
  }

  hideBabyMakerOverlay() {
    this.isBabyMakerActive = false;
    this.babyMakerOverlay.classList.add('hidden');
  }

  showStatusPanel(dog) {
    this.selectedDog = dog;
    const panel = this.statusPanel;

    // Update values
    panel.querySelector('.dog-name').textContent = dog.getDisplayName();
    panel.querySelector('.type-value').textContent = this.formatTypeKey(dog.getTypeKey());
    panel.querySelector('.gender-value').textContent = dog.gender === GENDER.MALE ? 'Male' : 'Female';
    panel.querySelector('.age-value').textContent = `${dog.ageYears} years`;
    panel.querySelector('.life-duration-value').textContent = this.formatLifeDuration(dog);
    panel.querySelector('.state-value').textContent = this.formatState(dog);
    panel.querySelector('.family-value').textContent = dog.family ? `Family #${dog.family.id}` : 'None';
    panel.querySelector('.mate-value').textContent = dog.mate ? dog.mate.getDisplayName() : 'None';

    // Show/hide Baby maker button based on whether dog can mate and has partner nearby
    const babyMakerBtn = panel.querySelector('.baby-maker-btn');
    const partner = this.findMateablePartner(dog);
    if (dog.canMate() && partner && !dog.isCourtship) {
      babyMakerBtn.style.display = 'flex';
    } else {
      babyMakerBtn.style.display = 'none';
    }

    panel.classList.remove('hidden');
  }

  hideStatusPanel() {
    this.statusPanel.classList.add('hidden');
    this.selectedDog = null;
  }

  formatTypeKey(typeKey) {
    return typeKey.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  formatLifeDuration(dog) {
    const totalMs = Date.now() - dog.birthTime;
    const totalSeconds = Math.floor(totalMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  }

  formatState(dog) {
    if (dog.isPicked) return 'Picked Up';
    if (dog.isFlying) return 'Flying';
    if (dog.isPlayerControlled) return 'Player Controlled';
    if (dog.isCourtship) return 'Courting';
    return dog.state.charAt(0).toUpperCase() + dog.state.slice(1);
  }

  update() {
    // Update status panel if visible
    if (this.selectedDog && !this.statusPanel.classList.contains('hidden')) {
      this.showStatusPanel(this.selectedDog);
    }
  }
}
