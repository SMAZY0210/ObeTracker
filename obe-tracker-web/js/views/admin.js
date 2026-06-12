const AdminView={
  // ── Dashboard ──────────────────────────────────────────────
  async dash(){
    const vr=document.getElementById('view-root');
    vr.innerHTML=`<div class="page-hd"><div class="page-hd-left"><h1>Dashboard</h1><div class="hd-sub">Bangladesh University of Professionals - Institution Overview</div></div></div>
      <div class="stats-row" id="dash-stats">${loading()}</div>`;
    try{
      const s=await Api.getDashboard();
      document.getElementById('dash-stats').innerHTML=[
        ['si-green','tree',s.deptCount,'Departments'],
        ['si-blue','book',s.programCount,'Programs'],
        ['si-amber','grid',s.courseCount,'Courses'],
        ['si-red','users',s.userCount,'Active Users'],
      ].map(([sc,ic,val,lbl])=>`<div class="stat-card"><div class="stat-icon-wrap ${sc}">${ico(ic,18)}</div><div class="stat-val">${val}</div><div class="stat-lbl">${lbl}</div></div>`).join('');
    }catch(e){document.getElementById('dash-stats').innerHTML=`<div class="alert alert-error"><span class="alert-icon">⚠</span>${e.message}</div>`}
  },

  // ── Structure ──────────────────────────────────────────────
  async structure(){
    document.getElementById('view-root').innerHTML=`
      <div class="page-hd"><div class="page-hd-left"><h1>Institutional Structure</h1><div class="hd-sub">Departments · Programs · Sessions</div></div></div>
      <div id="struct">
        <div class="tab-bar"><button class="tab-btn active" data-tab="td">Departments</button><button class="tab-btn" data-tab="tp">Programs</button><button class="tab-btn" data-tab="ts">Sessions</button></div>
        <div class="tab-pane active" id="td"></div><div class="tab-pane" id="tp"></div><div class="tab-pane" id="ts"></div>
      </div>`;
    initTabs('struct');this._depts();this._progs();this._sessions();
  },

  async _depts(){
    const el=document.getElementById('td');
    el.innerHTML=`<div class="flex-between mb3"><span class="sec-title">Departments</span><button class="btn btn-primary btn-sm" onclick="AdminView._addDept()">${ico('plus')} Add</button></div>
      <div class="tbl-wrap"><table><thead><tr><th>Code</th><th>Name</th><th>Status</th><th class="td-r">Actions</th></tr></thead><tbody id="dtb">${tdLoad(4)}</tbody></table></div>`;
    try{
      const l=await Api.getDepartments();
      document.getElementById('dtb').innerHTML=l.length?l.map(d=>`<tr>
        <td><span class="code-badge">${d.code}</span></td><td class="fw7">${d.name}</td>
        <td><span class="badge ${d.isActive?'bg-green':'bg-gray'}">${d.isActive?'Active':'Inactive'}</span></td>
        <td class="td-r"><button class="btn btn-secondary btn-xs" onclick="AdminView._editDept('${d.id}','${d.name}','${d.code}')">${ico('edit',13)} Edit</button></td>
      </tr>`).join(''):tdEmpty('No departments yet',4);
    }catch(e){document.getElementById('dtb').innerHTML=tdEmpty(e.message,4)}
  },
  _addDept(){showModal('Add Department',`<div class="form-row fr2"><div class="fg"><label>Name</label><input id="md-name" placeholder="e.g. Information and Communication Engineering"></div><div class="fg"><label>Code</label><input id="md-code" placeholder="e.g. ICE" style="text-transform:uppercase"></div></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="AdminView._saveDept()">${ico('save')} Save</button>`)},
  async _saveDept(){const name=document.getElementById('md-name').value.trim(),code=document.getElementById('md-code').value.trim();if(!name||!code)return toast('Name and code required','err');
    try{await Api.createDepartment({name,code});toast('Department added');closeModal();this._depts()}catch(e){toast(e.message,'err')}},
  _editDept(id,name,code){showModal('Edit Department',`<div class="form-row fr2"><div class="fg"><label>Name</label><input id="md-name" value="${name}"></div><div class="fg"><label>Code</label><input id="md-code" value="${code}"></div></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="AdminView._updDept('${id}')">${ico('save')} Save</button>`)},
  async _updDept(id){const name=document.getElementById('md-name').value.trim(),code=document.getElementById('md-code').value.trim();
    try{await Api.updateDepartment(id,{name,code});toast('Updated');closeModal();this._depts()}catch(e){toast(e.message,'err')}},

  async _progs(){
    const el=document.getElementById('tp');
    el.innerHTML=`<div class="flex-between mb3"><span class="sec-title">Programs</span><button class="btn btn-primary btn-sm" onclick="AdminView._addProg()">${ico('plus')} Add</button></div>
      <div class="tbl-wrap"><table><thead><tr><th>Code</th><th>Name</th><th>Department</th></tr></thead><tbody id="ptb">${tdLoad(3)}</tbody></table></div>`;
    try{const l=await Api.getPrograms();document.getElementById('ptb').innerHTML=l.length?l.map(p=>`<tr><td><span class="code-badge">${p.code}</span></td><td class="fw7">${p.name}</td><td class="text-muted">${p.department?.name||'-'}</td></tr>`).join(''):tdEmpty('No programs yet',3)}
    catch(e){document.getElementById('ptb').innerHTML=tdEmpty(e.message,3)}
  },
  async _addProg(){const d=await Api.getDepartments();showModal('Add Program',`<div class="fg mb3"><label>Department</label><select id="mp-dept">${d.map(x=>`<option value="${x.id}">${x.name}</option>`).join('')}</select></div>
    <div class="form-row fr2"><div class="fg"><label>Name</label><input id="mp-name" placeholder="e.g. B.Sc. in ICE"></div><div class="fg"><label>Code</label><input id="mp-code" placeholder="e.g. BICE"></div></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="AdminView._saveProg()">${ico('save')} Save</button>`)},
  async _saveProg(){const departmentId=document.getElementById('mp-dept').value,name=document.getElementById('mp-name').value.trim(),code=document.getElementById('mp-code').value.trim();
    if(!name||!code)return toast('Name and code required','err');
    try{await Api.createProgram({departmentId,name,code});toast('Program added');closeModal();this._progs()}catch(e){toast(e.message,'err')}},

  async _sessions(){
    const el=document.getElementById('ts');
    el.innerHTML=`<div class="flex-between mb3"><span class="sec-title">Sessions / Batches</span><button class="btn btn-primary btn-sm" onclick="AdminView._addSession()">${ico('plus')} Add</button></div>
      <div class="tbl-wrap"><table><thead><tr><th>Name</th><th>Start</th><th>Status</th><th class="td-r">Actions</th></tr></thead><tbody id="stb">${tdLoad(4)}</tbody></table></div>`;
    try{
      const l=await Api.getSessions();const sc={ACTIVE:'bg-green',DRAFT:'bg-gray',CLOSED:'bg-amber',ARCHIVED:'bg-gray'};
      document.getElementById('stb').innerHTML=l.length?l.map(s=>`<tr><td class="fw7">${s.name}</td><td class="text-muted">${new Date(s.startDate).getFullYear()}</td>
        <td><span class="badge ${sc[s.status]||'bg-gray'}">${s.status}</span></td>
        <td class="td-r"><button class="btn btn-secondary btn-xs" onclick="AdminView._editSession('${s.id}','${s.name}','${s.status}')">${ico('edit',13)} Status</button></td></tr>`).join(''):tdEmpty('No sessions yet',4);
    }catch(e){document.getElementById('stb').innerHTML=tdEmpty(e.message,4)}
  },
  _addSession(){showModal('Add Session',`<div class="form-row fr2"><div class="fg"><label>Name</label><input id="ms-name" placeholder="e.g. Batch 2026"></div><div class="fg"><label>Start Date</label><input type="date" id="ms-date"></div></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="AdminView._saveSession()">${ico('save')} Save</button>`)},
  async _saveSession(){const name=document.getElementById('ms-name').value.trim(),startDate=document.getElementById('ms-date').value;if(!name||!startDate)return toast('Name and date required','err');
    try{await Api.createSession({name,startDate});toast('Session added');closeModal();this._sessions()}catch(e){toast(e.message,'err')}},
  _editSession(id,name,cur){showModal(`Status - ${name}`,`<div class="fg"><label>Status</label><select id="ms-status">${['DRAFT','ACTIVE','CLOSED','ARCHIVED'].map(s=>`<option value="${s}" ${s===cur?'selected':''}>${s}</option>`).join('')}</select></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="AdminView._saveSessionStatus('${id}')">${ico('save')} Save</button>`)},
  async _saveSessionStatus(id){const status=document.getElementById('ms-status').value;try{await Api.updateSession(id,{status});toast('Updated');closeModal();this._sessions()}catch(e){toast(e.message,'err')}},

  // ── Courses ────────────────────────────────────────────────
  async courses(){
    document.getElementById('view-root').innerHTML=`
      <div class="page-hd"><div class="page-hd-left"><h1>Courses</h1><div class="hd-sub">All courses across sessions and programs</div></div>
        <div class="page-hd-actions"><button class="btn btn-primary" onclick="AdminView._addCourse()">${ico('plus')} Add Course</button></div>
      </div>
      <div class="filter-bar">
        <div class="search-wrap"><input id="cq" placeholder="Search by code or name…" oninput="AdminView._filterC()"></div>
        <select id="cf-sess" onchange="AdminView._loadC()"><option value="">All Sessions</option></select>
      </div>
      <div class="tbl-wrap"><table><thead><tr><th>Code</th><th>Course Name</th><th>Program</th><th>Batch</th><th style="text-align:center">Cr.</th><th>Faculty</th><th class="td-r" style="min-width:180px">Actions</th></tr></thead>
        <tbody id="ctb">${tdLoad(7)}</tbody></table></div>`;
    const sess=await Api.getSessions();sess.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name;document.getElementById('cf-sess').appendChild(o)});
    this._loadC();
  },
  async _loadC(){
    const sid=document.getElementById('cf-sess')?.value;document.getElementById('ctb').innerHTML=tdLoad(7);
    try{const l=await Api.getCourses(sid?{sessionId:sid}:{});this._cl=l;this._renderC(l)}catch(e){document.getElementById('ctb').innerHTML=tdEmpty(e.message,7)}
  },
  _filterC(){const q=document.getElementById('cq').value.toLowerCase();this._renderC((this._cl||[]).filter(c=>c.name.toLowerCase().includes(q)||c.code.toLowerCase().includes(q)))},
  _renderC(list){
    document.getElementById('ctb').innerHTML=list.length?list.map(c=>{
      const fac=(c.assignments||[]).map(a=>`<span class="tag">${a.faculty.firstName} ${a.faculty.lastName}</span>`).join(' ')||`<span class="tag tag-warn">⚠ Unassigned</span>`;
      const sn=c.name.replace(/'/g,'&#39;');
      return`<tr>
        <td><span class="code-badge">${c.code}</span></td>
        <td class="fw7">${c.name}</td>
        <td><span class="badge bg-gray">${c.program?.code||'-'}</span></td>
        <td class="text-muted">${c.session?.name||'-'}</td>
        <td style="text-align:center;color:var(--text3)">${c.creditHours}</td>
        <td><div style="display:flex;flex-wrap:wrap;gap:4px">${fac}</div></td>
        <td class="td-r">
          <div style="display:inline-flex;gap:6px">
            <button class="btn btn-secondary btn-xs" onclick="AdminView._assignFac('${c.id}','${c.code}')">${ico('add_user',13)} Assign</button>
            <button class="icon-btn danger" onclick="AdminView._delC('${c.id}','${sn}')" title="Delete course">${ico('trash',13)}</button>
          </div>
        </td></tr>`;
    }).join(''):tdEmpty('No courses found',7);
  },
  async _addCourse(){
    const[p,s]=await Promise.all([Api.getPrograms(),Api.getSessions()]);
    showModal('Add Course',`<div class="form-row fr2 mb3"><div class="fg"><label>Program</label><select id="mco-p">${p.map(x=>`<option value="${x.id}">${x.code} - ${x.name}</option>`).join('')}</select></div>
      <div class="fg"><label>Session / Batch</label><select id="mco-s">${s.map(x=>`<option value="${x.id}">${x.name}</option>`).join('')}</select></div></div>
      <div class="form-row fr2"><div class="fg"><label>Course Name</label><input id="mco-n" placeholder="e.g. Artificial Intelligence"></div>
      <div class="fg"><label>Course Code</label><input id="mco-c" placeholder="e.g. ICE-4107"></div></div>
      <div class="fg mt2" style="max-width:120px"><label>Credit Hours</label><input id="mco-cr" type="number" value="3" min="1" max="6"></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="AdminView._saveC()">${ico('save')} Add Course</button>`)},
  async _saveC(){const d={programId:document.getElementById('mco-p').value,sessionId:document.getElementById('mco-s').value,name:document.getElementById('mco-n').value.trim(),code:document.getElementById('mco-c').value.trim(),creditHours:parseInt(document.getElementById('mco-cr').value)||3};
    if(!d.name||!d.code)return toast('Name and code required','err');
    try{await Api.createCourse(d);toast('Course added');closeModal();this._loadC()}catch(e){toast(e.message,'err')}},
  async _delC(id,name){if(!confirm(`Delete "${name}"?`))return;try{await Api.deleteCourse(id);toast('Deleted');this._loadC()}catch(e){toast(e.message,'err')}},
  async _assignFac(courseId,code){
    const users=await Api.getUsers({role:'FACULTY'});
    const c=(this._cl||[]).find(x=>x.id===courseId);
    const assigned=new Set((c?.assignments||[]).map(a=>a.faculty.id));
    showModal(`Assign Faculty - ${code}`,`<div style="display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto">
      ${users.map(u=>`<label style="display:flex;align-items:center;gap:12px;padding:11px 13px;border:1.5px solid ${assigned.has(u.id)?'var(--green)':'var(--border)'};border-radius:8px;cursor:pointer;background:${assigned.has(u.id)?'var(--green-xl)':'#fff'};transition:all .12s" onmouseenter="this.style.borderColor='var(--green)'" onmouseleave="this.style.borderColor='${assigned.has(u.id)?'var(--green)':'var(--border)'}'"">
        <input type="checkbox" value="${u.id}" ${assigned.has(u.id)?'checked':''} style="width:auto;accent-color:var(--green)">
        <div><div class="fw7">${u.firstName} ${u.lastName}</div><div class="text-sm text-muted">${u.email}</div></div>
      </label>`).join('')}</div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="AdminView._saveAssign('${courseId}')">${ico('save')} Save</button>`)},
  async _saveAssign(courseId){const ids=[...document.querySelectorAll('#modal-body input[type=checkbox]:checked')].map(c=>c.value);
    try{await Api.assignFaculty(courseId,ids);toast('Faculty assigned');closeModal();this._loadC()}catch(e){toast(e.message,'err')}},

  // ── Users ──────────────────────────────────────────────────
  async users(){
    document.getElementById('view-root').innerHTML=`
      <div class="page-hd">
        <div class="page-hd-left"><h1>Users</h1><div class="hd-sub">Search by role or batch year to view accounts</div></div>
        <div class="page-hd-actions">
          <button class="btn btn-secondary" onclick="AdminView._bulkUpload()">${ico('plus')} Bulk Upload</button>
          <button class="btn btn-primary" onclick="AdminView._addUser()">${ico('add_user')} Add User</button>
        </div>
      </div>
      <div class="filter-bar">
        <div class="search-wrap"><input id="uq" placeholder="Search name, email or ID..." oninput="AdminView._filterU()"></div>
        <select id="uf-role" onchange="AdminView._loadU()">
          <option value="">-- Role --</option>
          <option value="ADMIN">Admin</option>
          <option value="FACULTY">Faculty</option>
          <option value="STUDENT">Student</option>
        </select>
        <select id="uf-batch" onchange="AdminView._loadU()">
          <option value="">-- Batch Year --</option>
          <option value="2020">Batch 2020</option>
          <option value="2021">Batch 2021</option>
          <option value="2022">Batch 2022</option>
          <option value="2023">Batch 2023</option>
          <option value="2024">Batch 2024</option>
          <option value="2025">Batch 2025</option>
          <option value="2026">Batch 2026</option>
        </select>
        <select id="uf-dept" onchange="AdminView._loadU()">
          <option value="">-- Department --</option>
        </select>
        <select id="uf-section" onchange="AdminView._loadU()">
          <option value="">-- Section --</option>
          <option value="A">Section A</option>
          <option value="B">Section B</option>
        </select>
      </div>
      <div class="tbl-wrap"><table><thead><tr>
        <th>Name</th><th>Email / ID</th><th>Role</th><th>Batch</th><th>Section</th>
        <th style="text-align:center">Active</th><th>Last Login</th><th class="td-r">Report</th>
      </tr></thead>
      <tbody id="utb"><tr><td colspan="6" class="td-load text-muted">Select a role or batch year above to view users.</td></tr></tbody>
      </table></div>`;
  },

  async _loadU(){
    const role=document.getElementById('uf-role')?.value;
    const batchYear=document.getElementById('uf-batch')?.value;
    const deptId=document.getElementById('uf-dept')?.value;

    // Populate dept dropdown if empty
    const deptSel=document.getElementById('uf-dept');
    if(deptSel && deptSel.options.length<=1){
      try{const depts=await Api.getDepartments();depts.forEach(d=>{const o=document.createElement('option');o.value=d.id;o.textContent=d.name;deptSel.appendChild(o);});}catch(_){}
    }

    const section2=document.getElementById('uf-section')?.value;
    if(!role && !batchYear && !deptId && !section2){
      document.getElementById('utb').innerHTML='<tr><td colspan="8" class="td-load text-muted">Select a role, batch or department to view users.</td></tr>';
      return;
    }
    document.getElementById('utb').innerHTML=tdLoad(6);
    try{
      const params={};
      if(role) params.role=role;
      if(batchYear) params.batchYear=batchYear;
      const section=document.getElementById('uf-section')?.value;
      if(section) params.section=section;
      const l=await Api.getUsers(params);
      // Client-side dept filter: filter by institutionalId prefix or show all
      // (dept filtering is approximate for now — backend doesn't have dept on user directly)
      this._ul=l;
      if(!l.length){
        document.getElementById('utb').innerHTML='<tr><td colspan="8" class="td-load text-muted">No users found for the selected filters.</td></tr>';
      } else {
        this._renderU(l);
      }
    }catch(e){document.getElementById('utb').innerHTML=tdEmpty(e.message,6)}
  },

  _filterU(){const q=document.getElementById('uq').value.toLowerCase();this._renderU((this._ul||[]).filter(u=>`${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q)))},
  _renderU(list){
    const getBatch = (u) => {
      if(u.role !== 'STUDENT' || !u.institutionalId) return '--';
      return 'Batch 20' + u.institutionalId.substring(0,2);
    };
    document.getElementById('utb').innerHTML = list.length ? list.map(u => {
      const batch = getBatch(u);
      const sec = (u.role==='STUDENT' && u.section) ? '<span class="badge bg-gray">Section '+u.section+'</span>' : '--';
      return `<tr>
        <td class="fw7">${u.firstName} ${u.lastName}</td>
        <td class="text-muted text-sm">${u.role==='STUDENT'?(u.institutionalId||u.email):u.email}</td>
        <td><span class="role-pill rp-${u.role}">${u.role}</span></td>
        <td><span class="badge ${u.role==='STUDENT'?'bg-blue':'bg-gray'}">${u.role==='STUDENT'?batch:'--'}</span></td>
        <td>${sec}</td>
        <td style="text-align:center">
          <label class="tog"><input type="checkbox" ${u.isActive?'checked':''} onchange="AdminView._togUser('${u.id}',this)"><span class="tog-track"></span></label>
        </td>
        <td class="text-muted text-sm">${u.lastLoginAt?new Date(u.lastLoginAt).toLocaleDateString():'Never'}</td>
        <td class="td-r">${u.role==='STUDENT'?`<button class="btn btn-primary btn-xs" onclick="AdminView._viewStuAtt('${u.id}','${u.firstName} ${u.lastName}')">Attainment</button>`:'--'}</td>
      </tr>`;
    }).join('') : tdEmpty('No users found', 7);
  },
  async outcomes(){
    const progs = await Api.getPrograms();
    document.getElementById('view-root').innerHTML = `
      <div class="page-hd">
        <div class="page-hd-left"><h1>Program Outcomes</h1><div class="hd-sub">PO1-PO12 per program</div></div>
        <div class="page-hd-actions">
          <select id="po-prog" style="min-width:260px" onchange="AdminView._loadPOs()">
            ${progs.map(p=>`<option value="${p.id}">${p.code} - ${p.name}</option>`).join('')}
          </select>
          <button class="btn btn-primary" onclick="AdminView._addPO()">${ico('plus')} Add PO</button>
        </div>
      </div>
      <div id="po-area">${loading()}</div>`;
    if (progs.length) this._loadPOs();
  },

  async _loadPOs(){
    const pid=document.getElementById('po-prog')?.value;if(!pid)return;
    const el=document.getElementById('po-area');el.innerHTML=loading();
    try{
      const l=await Api.getProgramOutcomes(pid);
      el.innerHTML=l.length?`<div class="po-grid">${l.map(po=>`<div class="po-card">
        <div class="po-card-top"><span class="po-code">${po.code}</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-xs" onclick="AdminView._editPO('${po.id}','${po.code}','${po.title.replace(/'/g,'&#39;')}','${(po.description||'').replace(/'/g,'&#39;')}')">${ico('edit',13)} Edit</button>
            <button class="icon-btn danger" onclick="AdminView._delPO('${po.id}','${po.code}')">${ico('trash',13)}</button>
          </div>
        </div>
        <div class="po-card-title">${po.title}</div>
        ${po.description?`<div class="po-card-desc">${po.description}</div>`:''}
      </div>`).join('')}</div>`
      :`<div class="empty-box"><div class="empty-ico">${ico('target',24)}</div><h3>No outcomes yet</h3><p>Add PO1-PO12 for this program.</p></div>`;
    }catch(e){el.innerHTML=`<div class="alert alert-error"><span class="alert-icon">⚠</span>${e.message}</div>`}
  },
  _addPO(){if(!document.getElementById('po-prog')?.value)return toast('Select a program first','err');
    showModal('Add Program Outcome',`<div class="form-row fr2 mb3"><div class="fg"><label>Code</label><input id="mpo-code" placeholder="e.g. PO1"></div><div class="fg"><label>Title</label><input id="mpo-title" placeholder="e.g. Engineering Knowledge"></div></div>
      <div class="fg"><label>Description</label><textarea id="mpo-desc" rows="3" placeholder="Describe this outcome…"></textarea></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="AdminView._savePO()">${ico('save')} Add</button>`)},
  async _savePO(){const pid=document.getElementById('po-prog').value,code=document.getElementById('mpo-code').value.trim(),title=document.getElementById('mpo-title').value.trim(),description=document.getElementById('mpo-desc').value.trim();
    if(!code||!title)return toast('Code and title required','err');
    try{await Api.createProgramOutcome(pid,{code,title,description});toast('PO added');closeModal();this._loadPOs()}catch(e){toast(e.message,'err')}},
  _editPO(id,code,title,desc){showModal('Edit PO',`<div class="form-row fr2 mb3"><div class="fg"><label>Code</label><input id="mpo-code" value="${code}"></div><div class="fg"><label>Title</label><input id="mpo-title" value="${title}"></div></div>
    <div class="fg"><label>Description</label><textarea id="mpo-desc" rows="3">${desc}</textarea></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="AdminView._updPO('${id}')">${ico('save')} Save</button>`)},
  async _updPO(id){const code=document.getElementById('mpo-code').value.trim(),title=document.getElementById('mpo-title').value.trim(),description=document.getElementById('mpo-desc').value.trim();
    try{await Api.updateProgramOutcome(id,{code,title,description});toast('Updated');closeModal();this._loadPOs()}catch(e){toast(e.message,'err')}},
  async _delPO(id,code){if(!confirm(`Delete ${code}? Fails if mappings exist.`))return;
    try{await Api.deleteProgramOutcome(id);toast('Deleted');this._loadPOs()}catch(e){toast(e.message,'err')}},

  // ── Thresholds ─────────────────────────────────────────────
  async _togUser(id,cb){const v=cb.checked;try{await Api.updateUser(id,{isActive:v});toast('User '+(v?'activated':'deactivated'))}catch(e){cb.checked=!v;toast(e.message,'err')}},
  _bulkUpload(){showModal('Bulk Upload Users',`<div class="alert alert-info mb3"><span class="alert-icon">i</span>Upload CSV or Excel. Required columns:<br><strong>firstName, lastName, email, role, institutionalId, section</strong><br>Role: STUDENT / FACULTY / ADMIN &nbsp;|&nbsp; Section: A or B (students only)<br>Student password defaults to institutionalId.</div><div class="fg mb3"><label>Download Template</label><button class="btn btn-secondary btn-sm" onclick="AdminView._dlTemplate()">${ico('dl',13)} CSV Template</button></div><div class="fg"><label>Upload File (CSV or Excel)</label><input type="file" id="bulk-file" accept=".csv,.xlsx,.xls" style="padding:8px"></div><div id="bulk-preview" class="mt3"></div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-secondary" onclick="AdminView._parseFile()">${ico('edit')} Parse File</button><button class="btn btn-primary" onclick="AdminView._confirmBulk()">${ico('save')} Confirm Upload</button>`);},
  _dlTemplate(){const csv='firstName,lastName,email,role,institutionalId,section\nJohn,Doe,john@bup.edu.bd,STUDENT,23549009999,A\nJane,Smith,jane@bup.edu.bd,STUDENT,23549009998,B\nProf,Khan,prof@bup.edu.bd,FACULTY,,';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='users_template.csv';a.click();},
  async _parseFile(){
    const file=document.getElementById('bulk-file')?.files[0];if(!file)return toast('Select a file','err');
    const preview=document.getElementById('bulk-preview');preview.innerHTML='<div class="loading-box" style="padding:10px 0"><div class="spin"></div> Reading...</div>';
    try{
      let users=[];const mapRow=r=>({firstName:String(r.firstName||r['First Name']||r.firstname||'').trim(),lastName:String(r.lastName||r['Last Name']||r.lastname||'').trim(),email:String(r.email||r.Email||'').trim(),role:String(r.role||r.Role||'STUDENT').toUpperCase().trim(),institutionalId:String(r.institutionalId||r['Institutional ID']||r.institutionalid||'').trim(),section:(String(r.section||r.Section||'').trim().toUpperCase()||null)});
      if(file.name.endsWith('.csv')){const text=await file.text();const ls=text.trim().split('\n');const headers=ls[0].split(',').map(h=>h.trim().replace(/^"|"$/g,'').toLowerCase());users=ls.slice(1).filter(l=>l.trim()).map(line=>{const vals=line.split(',').map(v=>v.trim().replace(/^"|"$/g,''));const obj={};headers.forEach((h,i)=>obj[h]=vals[i]||'');return mapRow({firstName:obj.firstname||obj['first name'],lastName:obj.lastname||obj['last name'],email:obj.email,role:obj.role,institutionalId:obj.institutionalid||obj['institutional id']});});}
      else{const ab=await file.arrayBuffer();const XLSX=await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');const wb=XLSX.read(ab);users=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''}).map(mapRow);}
      if(!users.length){preview.innerHTML='<div class="alert alert-warn">No data found.</div>';return;}
      preview.innerHTML='<div class="sec-title mb2">Preview - '+users.length+' users</div><div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--r)"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead style="background:var(--surface2)"><tr><th style="padding:7px 10px">Name</th><th style="padding:7px 10px">Email / ID</th><th style="padding:7px 10px">Role</th><th style="padding:7px 10px">Batch</th><th style="padding:7px 10px">Section</th></tr></thead><tbody>'+users.slice(0,50).map((u,i)=>'<tr style="background:'+(i%2?'var(--surface2)':'var(--surface)')+'"><td style="padding:6px 10px;border-top:1px solid var(--border)">'+u.firstName+' '+u.lastName+'</td><td style="padding:6px 10px;border-top:1px solid var(--border);font-family:monospace;font-size:11px">'+(u.role==='STUDENT'?(u.institutionalId||u.email):u.email)+'</td><td style="padding:6px 10px;border-top:1px solid var(--border)"><span class="role-pill rp-'+(u.role||'STUDENT')+'">'+(u.role||'STUDENT')+'</span></td><td style="padding:6px 10px;border-top:1px solid var(--border)">'+(u.role==='STUDENT'&&u.institutionalId?'Batch 20'+u.institutionalId.substring(0,2):'--')+'</td></tr>').join('')+(users.length>50?'<tr><td colspan="4" style="padding:8px;text-align:center;color:var(--text3)">...and '+(users.length-50)+' more</td></tr>':'')+'</tbody></table></div>';
      window._bulkUsers=users;toast(users.length+' users parsed. Click Confirm Upload.','ok');
    }catch(e){preview.innerHTML='<div class="alert alert-error"><span class="alert-icon">!</span>'+e.message+'</div>';}
  },
  async _confirmBulk(){const users=window._bulkUsers;if(!users||!users.length)return toast('Parse a file first','err');
    try{const res=await Api.bulkCreateUsers(users);toast('Created: '+res.created+', Skipped: '+res.skipped+(res.errors.length?', Errors: '+res.errors.length:''),'ok');closeModal();window._bulkUsers=null;this._loadU();}catch(e){toast(e.message,'err');}},
  _addUser() {
    showModal('Create User', `
      <div class="form-row fr2 mb3">
        <div class="fg"><label>First Name</label><input id="mu-fn" placeholder="First name"></div>
        <div class="fg"><label>Last Name</label><input id="mu-ln" placeholder="Last name"></div>
      </div>
      <div class="fg mb3"><label>Email</label>
        <input id="mu-em" type="email" placeholder="name@bup.edu.bd">
      </div>
      <div class="form-row fr2 mb3">
        <div class="fg"><label>Role</label>
          <select id="mu-role" onchange="AdminView._onRoleChange()">
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div class="fg"><label>Institutional ID</label>
          <input id="mu-id" placeholder="e.g. 23549009001">
        </div>
      </div>
      <div id="mu-extra" style="border-top:1px solid var(--border);padding-top:14px">
        <div class="form-row fr3 mb0">
          <div class="fg"><label>Batch Year</label>
            <select id="mu-batch">
              <option value="">-- Select --</option>
              ${['2020','2021','2022','2023','2024','2025','2026'].map(y=>'<option value="'+y+'">'+y+'</option>').join('')}
            </select>
          </div>
          <div class="fg"><label>Section</label>
            <select id="mu-section">
              <option value="">-- Select --</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
            </select>
          </div>
          <div class="fg"><label>Department</label>
            <select id="mu-dept"><option value="">Loading...</option></select>
          </div>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="AdminView._saveUser()">${ico('save')} Create</button>`
    );
    // Populate departments after modal renders
    setTimeout(() => {
      Api.getDepartments().then(depts => {
        const s = document.getElementById('mu-dept');
        if (s) s.innerHTML = '<option value="">-- Select --</option>' +
          depts.map(d => '<option value="' + d.id + '">' + d.name + '</option>').join('');
      }).catch(() => {});
      // Show extra fields by default (Student is default role)
      AdminView._onRoleChange();
    }, 50);
  },

  _onRoleChange() {
    const role  = document.getElementById('mu-role')?.value;
    const extra = document.getElementById('mu-extra');
    if (extra) extra.style.display = (role === 'STUDENT' || !role) ? '' : 'none';
  },


  async _saveUser() {
    const role   = document.getElementById('mu-role').value;
    const instId = document.getElementById('mu-id').value.trim();
    const section = role === 'STUDENT' ? (document.getElementById('mu-section')?.value || null) : null;
    const d = {
      firstName:      document.getElementById('mu-fn').value.trim(),
      lastName:       document.getElementById('mu-ln').value.trim(),
      email:          document.getElementById('mu-em').value.trim(),
      role,
      institutionalId: instId || null,
      section,
    };
    if (!d.firstName || !d.lastName || !d.email) return toast('Name and email required', 'err');
    try {
      const r = await Api.createUser(d);
      toast('Created! Password: ' + (r.tempPassword || instId || '1234'), 'ok');
      closeModal();
      this._loadU();
    } catch(e) { toast(e.message, 'err'); }
  },


  async attainmentReport(){
    document.getElementById('view-root').innerHTML=`<div class="page-hd"><div class="page-hd-left"><h1>Attainment Report</h1><div class="hd-sub">CO/PO attainment by batch and department</div></div></div>${loading()}`;
    try{
      const [sessions,depts]=await Promise.all([Api.getSessions(),Api.getDepartments()]);
      document.getElementById('view-root').innerHTML=`
        <div class="page-hd"><div class="page-hd-left"><h1>Attainment Report</h1><div class="hd-sub">View attainment across batches and departments</div></div></div>
        <div class="card mb4"><div class="card-bd">
          <div class="filter-bar" style="margin-bottom:0">
            <div class="fg" style="flex:1;margin:0"><label>Batch / Session</label>
              <select id="ar-sess"><option value="">All Batches</option>${sessions.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
            <div class="fg" style="flex:1;margin:0"><label>Department</label>
              <select id="ar-dept"><option value="">All Departments</option>${depts.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></div>
            <div class="fg" style="flex:1;margin:0"><label>Student ID (optional)</label>
              <input id="ar-stu" placeholder="e.g. 23549009001" style="font-family:monospace"></div>
            <div style="padding-top:22px">
              <button class="btn btn-primary" onclick="AdminView._loadAttainReport()">${ico('chart')} View Report</button>
            </div>
          </div>
        </div></div>
        <div id="ar-result"></div>`;
    }catch(e){document.getElementById('view-root').innerHTML+=`<div class="alert alert-error"><span class="alert-icon">&#9888;</span>${e.message}</div>`}
  },

  async _loadAttainReport(){
    const sessId=document.getElementById('ar-sess').value;
    const deptId=document.getElementById('ar-dept').value;
    const el=document.getElementById('ar-result');
    el.innerHTML=loading();
    try{
      const stuInput=document.getElementById('ar-stu')?.value?.trim();
      const filters={};
      if(sessId) filters.sessionId=sessId;
      if(deptId) filters.departmentId=deptId;

      // If student ID entered, look up student and show individual report
      if(stuInput){
        const users=await Api.getUsers({role:'STUDENT',search:stuInput});
        const stu=users.find(u=>u.institutionalId===stuInput||u.email===stuInput);
        if(!stu){el.innerHTML='<div class="alert alert-warn">Student "'+stuInput+'" not found.</div>';return;}
        AdminView._viewStuAtt(stu.id, stu.firstName+' '+stu.lastName);
        el.innerHTML='';
        return;
      }

      const{coSummary,poSummary}=await Api.getAttainmentReport(filters);
      if(!coSummary.length&&!poSummary.length){
        el.innerHTML=`<div class="empty-box"><div class="empty-ico">${ico('chart',24)}</div><h3>No data for this filter</h3><p>Try a different batch or department.</p></div>`;
        return;
      }
      el.innerHTML=`
        <div class="flex-between mb3"><div class="sec-title">Course Outcome Attainment</div>
          <button class="btn btn-secondary btn-sm" onclick="AdminView._exportCSV()">${ico('dl',13)} Export CSV</button></div>
        <div class="tbl-wrap mb4"><table>
          <thead><tr><th>Course</th><th>CO</th><th>Title</th>
            <th style="text-align:center">Attained</th><th style="text-align:center">Total</th>
            <th style="min-width:160px">Rate</th></tr></thead>
          <tbody>${coSummary.map(r=>{const lvl=r.attainmentRate>=60?'L3':'L0';return`<tr>
            <td><span class="code-badge">${r.courseCode}</span></td>
            <td><span class="badge bg-green">${r.coCode||'?'}</span></td>
            <td>${r.coTitle||'?'}</td>
            <td style="text-align:center;font-weight:700;color:var(--l3)">${r.attained||0}</td>
            <td style="text-align:center;color:var(--text3)">${r.total||0}</td>
            <td>${attBar(r.attainmentRate||0,lvl)}</td>
          </tr>`}).join('')}</tbody>
        </table></div>
        <div class="sec-title mb3">Program Outcome Attainment</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>PO</th><th>Title</th>
            <th style="text-align:center">Attained</th><th style="text-align:center">Total</th>
            <th style="min-width:160px">Rate</th></tr></thead>
          <tbody>${poSummary.map(r=>{const lvl=r.attainmentRate>=60?'L3':'L0';return`<tr>
            <td><span class="badge bg-blue">${r.poCode||'?'}</span></td>
            <td>${r.poTitle||'?'}</td>
            <td style="text-align:center;font-weight:700;color:var(--l3)">${r.attained||0}</td>
            <td style="text-align:center;color:var(--text3)">${r.total||0}</td>
            <td>${attBar(r.attainmentRate||0,lvl)}</td>
          </tr>`}).join('')}</tbody>
        </table></div>`;
      this._lastReport={coSummary,poSummary};
    }catch(e){el.innerHTML=`<div class="alert alert-error"><span class="alert-icon">&#9888;</span>${e.message}</div>`}
  },

  async _viewStuAtt(studentId, name){
    showModal('Attainment Report - ' + name, loading(), '', true);
    try{
      const d = await Api.getStudentAttainmentAdmin(studentId);
      const stu = d.student || {};
      const batch = stu.institutionalId ? 'Batch 20'+stu.institutionalId.substring(0,2) : '--';
      const sec   = stu.section ? 'Section '+stu.section : '--';

      const coByGroup = {};
      (d.coAttainments||[]).forEach(r => {
        const k = r.courseId || 'Unknown';
        if(!coByGroup[k]) coByGroup[k] = { courseCode: r.courseCode||k, rows: [] };
        coByGroup[k].rows.push(r);
      });

      let coHtml = '';
      if((d.coAttainments||[]).length === 0){
        coHtml = '<tr><td colspan="4" class="td-load text-muted">No CO attainment data yet</td></tr>';
      } else {
        (d.coAttainments||[]).forEach(r => {
          const att = r.level==='L3';
          coHtml += '<tr>' +
            '<td><span class="badge bg-green">'+r.courseOutcome.code+'</span></td>' +
            '<td>'+r.courseOutcome.title+'</td>' +
            '<td style="text-align:center"><span class="badge '+(att?'bg-green':'bg-red')+'">'+(att?'Attained':'Not Attained')+'</span></td>' +
            '<td style="text-align:right;font-weight:700;color:'+(att?'var(--l3)':'var(--l0)')+'">'+r.percentage.toFixed(1)+'%</td>' +
            '</tr>';
        });
      }

      let poHtml = '';
      if((d.poAttainments||[]).length === 0){
        poHtml = '<tr><td colspan="4" class="td-load text-muted">No PO attainment data yet</td></tr>';
      } else {
        (d.poAttainments||[]).forEach(r => {
          const att = r.level==='L3';
          poHtml += '<tr>' +
            '<td><span class="badge bg-blue">'+r.programOutcome.code+'</span></td>' +
            '<td>'+r.programOutcome.title+'</td>' +
            '<td style="text-align:center"><span class="badge '+(att?'bg-green':'bg-red')+'">'+(att?'Attained':'Not Attained')+'</span></td>' +
            '<td style="text-align:right;font-weight:700;color:'+(att?'var(--l3)':'var(--l0)')+'">'+r.percentage.toFixed(1)+'%</td>' +
            '</tr>';
        });
      }

      document.getElementById('modal-body').innerHTML =
        '<div style="display:flex;gap:16px;margin-bottom:16px;padding:12px;background:var(--surface2);border-radius:var(--r)">' +
          '<div><span class="text-muted text-sm">Student</span><div class="fw7">'+name+'</div></div>' +
          '<div><span class="text-muted text-sm">ID</span><div class="fw7" style="font-family:monospace">'+(stu.institutionalId||'--')+'</div></div>' +
          '<div><span class="text-muted text-sm">Batch</span><div class="fw7">'+batch+'</div></div>' +
          '<div><span class="text-muted text-sm">Section</span><div class="fw7">'+sec+'</div></div>' +
        '</div>' +
        '<div class="sec-title mb2">Course Outcome Attainment</div>' +
        '<div class="tbl-wrap mb4"><table><thead><tr><th>CO</th><th>Title</th><th style="text-align:center">Result</th><th style="text-align:right">Score</th></tr></thead>' +
        '<tbody>'+coHtml+'</tbody></table></div>' +
        '<div class="sec-title mb2">Program Outcome Attainment</div>' +
        '<div class="tbl-wrap"><table><thead><tr><th>PO</th><th>Title</th><th style="text-align:center">Result</th><th style="text-align:right">Score</th></tr></thead>' +
        '<tbody>'+poHtml+'</tbody></table></div>';

      const attained = (d.coAttainments||[]).filter(r=>r.level==='L3').length;
      const total    = (d.coAttainments||[]).length;
      document.getElementById('modal-ft').innerHTML =
        '<span class="text-sm text-muted">CO attained: '+attained+'/'+total+'</span>' +
        '<button class="btn btn-ghost" onclick="closeModal()">Close</button>';
      document.getElementById('modal-ft').classList.remove('hidden');
    }catch(e){document.getElementById('modal-body').innerHTML='<div class="alert alert-error">'+e.message+'</div>';}
  },
  _exportCSV(){
    const d=this._lastReport; if(!d) return;
    const rows=[
      ['Type','Course','Code','Title','Attained','Total','Rate(%)'],
      ...d.coSummary.map(r=>['CO',r.courseCode,r.coCode,r.coTitle,r.attained,r.total,r.attainmentRate]),
      ['','','','','','',''],
      ...d.poSummary.map(r=>['PO','',r.poCode,r.poTitle,r.attained,r.total,r.attainmentRate]),
    ];
    const csv=rows.map(r=>r.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download='attainment_report.csv'; a.click();
  },

};
