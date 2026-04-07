document.addEventListener('DOMContentLoaded', () => {
    const materialsContainer = document.getElementById('materials-container');
    const topicContainer = document.getElementById('topic-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const dashboardView = document.getElementById('dashboard-view');
    const searchInput = document.getElementById('search-input');

    let allMaterials = [];

    // Fetch Materials
    async function fetchMaterials() {
        try {
            const response = await fetch('/api/materials');
            const data = await response.json();
            allMaterials = data;
            renderMaterialsList(data);
        } catch (error) {
            console.error('Error fetching materials:', error);
            materialsContainer.innerHTML = '<p class="error">Erro ao carregar materiais.</p>';
        }
    }

    function renderMaterialsList(materials) {
        materialsContainer.innerHTML = '';
        materials.forEach(mat => {
            const div = document.createElement('div');
            div.className = 'material-item';
            div.innerHTML = `
                <div class="material-info">
                    <h4>${mat.titulo_principal || 'Sem título'}</h4>
                    <p>${mat.disciplina || 'Disciplina não informada'}</p>
                </div>
            `;
            div.onclick = () => loadMaterial(mat.material_id, div);
            materialsContainer.appendChild(div);
        });
    }

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allMaterials.filter(m => 
            (m.titulo_principal && m.titulo_principal.toLowerCase().includes(term)) ||
            (m.disciplina && m.disciplina.toLowerCase().includes(term))
        );
        renderMaterialsList(filtered);
    });

    async function loadMaterial(id, element) {
        // Toggle active class
        document.querySelectorAll('.material-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');

        // Show loading
        welcomeScreen.style.display = 'none';
        dashboardView.style.display = 'block';
        topicContainer.innerHTML = '<div class="spinner"></div>';

        try {
            const response = await fetch(`/api/material/${id}`);
            const data = await response.json();
            renderDashboard(data);
        } catch (error) {
            console.error('Error loading material:', error);
            topicContainer.innerHTML = '<p class="error">Erro ao carregar detalhes do material.</p>';
        }
    }

    function renderDashboard(data) {
        const { material, tree } = data;
        
        document.getElementById('mat-title').textContent = material.titulo_principal;
        document.getElementById('mat-discipline').textContent = material.disciplina;
        document.getElementById('mat-theme').textContent = material.tema_principal;

        topicContainer.innerHTML = '';
        tree.forEach(node => {
            topicContainer.appendChild(createTopicElement(node));
        });
    }

    function createTopicElement(node) {
        const div = document.createElement('div');
        div.className = 'topic-node';
        
        const header = document.createElement('div');
        header.className = 'topic-header';
        header.innerHTML = `
            <div class="topic-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </div>
            <span style="font-weight: 600;">${node.numero ? node.numero + ' - ' : ''}${node.titulo}</span>
        `;
        
        const content = document.createElement('div');
        content.className = 'topic-content';

        // Render Components
        if (node.components && node.components.length > 0) {
            node.components.forEach(comp => {
                const card = document.createElement('div');
                card.className = 'component-card';
                card.innerHTML = `
                    <h5>${comp.tipo}</h5>
                    <div class="text-block-content">${comp.conteudo_texto || JSON.stringify(comp.conteudo_json, null, 2)}</div>
                `;
                content.appendChild(card);
            });
        }

        // Render Questions
        if (node.questions && node.questions.length > 0) {
            node.questions.forEach(q => {
                const card = document.createElement('div');
                card.className = 'component-card question-card';
                card.innerHTML = `
                    <h5>Questão (${q.banca || 'Própria'})</h5>
                    <div class="question-text">${q.enunciado}</div>
                    <div class="question-answer">Resposta: ${q.resposta_correta}</div>
                `;
                content.appendChild(card);
            });
        }

        // Render Children (Recursive)
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                content.appendChild(createTopicElement(child));
            });
        }

        header.onclick = (e) => {
            e.stopPropagation();
            div.classList.toggle('expanded');
        };

        div.appendChild(header);
        div.appendChild(content);
        return div;
    }

    fetchMaterials();
});
