// Replace this sample case study with your own hardware project.
export const VACUUM = {
  "title": "Project Six",
  "subtitle": "[Your hardware project subtitle]",
  "image": "/images/hardware-placeholder.svg",
  "illustrationSource": "/images/hardware-placeholder.svg",
  "intro": "[Describe the hardware project, the problem it addresses, and how the system works.]",
  "systems": [
    {
      "title": "Sense & navigate",
      "text": "[Describe the sensors, inputs, and navigation logic.]"
    },
    {
      "title": "Vacuum & mop",
      "text": "[Describe the cleaning mechanism or your second subsystem.]"
    },
    {
      "title": "Two ways to control",
      "text": "[Describe the control modes, connectivity, and firmware.]"
    }
  ],
  "contribution": "[Describe your personal hardware, design, or firmware contributions.]",
  "outcome": "[Add a verified result, demonstration, or milestone for your project.]",
  "stack": [
    "[Controller]",
    "[Firmware]",
    "[Sensors]",
    "[Connectivity]",
    "[Materials]",
    "[Tools]"
  ]
};

export function vacuumContent() {
  return `<div class="vacuum-heading"><p class="vacuum-eyebrow">Hardware / Embedded systems</p><h2 tabindex="-1">${VACUUM.title}<span>.</span></h2><p class="vacuum-subtitle">${VACUUM.subtitle}</p></div>
    <div class="vacuum-overview"><figure class="vacuum-illustration"><img src="${VACUUM.image}" alt="Placeholder hardware system overview" width="1200" height="800"/><figcaption>Placeholder system illustration · replace with your project artwork</figcaption><a href="${VACUUM.illustrationSource}" target="_blank" rel="noopener">View system illustration ↗</a></figure><section class="vacuum-build"><h3>The build</h3><p>${VACUUM.intro}</p><div class="vacuum-outcome"><h3>Outcome</h3><p>${VACUUM.outcome}</p></div></section></div>
    <section class="vacuum-systems"><h3>Inside the system</h3><div class="vacuum-tabs" role="tablist" aria-label="Inside the sample hardware system">${VACUUM.systems.map((system, i) => `<button type="button" role="tab" id="vacuum-tab-${i}" aria-controls="vacuum-system-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-vacuum-tab="${i}"><span>0${i + 1}</span>${system.title}</button>`).join('')}</div>${VACUUM.systems.map((system, i) => `<div class="vacuum-system" id="vacuum-system-${i}" role="tabpanel" aria-labelledby="vacuum-tab-${i}" ${i ? 'hidden' : ''}><h4>${system.title}</h4><p>${system.text}</p></div>`).join('')}</section>
    <div class="vacuum-footer"><section><h3>My contribution</h3><p>${VACUUM.contribution}</p></section><section><h3>Built with</h3><div class="skill-list">${VACUUM.stack.map(item => `<span>${item}</span>`).join('')}</div></section></div>`;
}

export function initVacuumTabs(root) {
  const tabs = [...root.querySelectorAll('[data-vacuum-tab]')];
  const select = (index, focus = false) => {
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; root.querySelector(`#vacuum-system-${i}`).hidden = i !== index; });
    if (focus) tabs[index].focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', event => {
      const next = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return; event.preventDefault(); select(next, true);
    });
  });
}
