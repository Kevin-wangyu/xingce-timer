(function() {
    'use strict';

    // ---------- DOM ----------
    const timerDisplay = document.getElementById('timerDisplay');
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const statusHint = document.getElementById('statusHint');
    const controls = document.getElementById('controls');

    // 模块相关
    const moduleMenuModal = document.getElementById('moduleMenuModal');
    const moduleRecordModal = document.getElementById('moduleRecordModal');
    const moduleViewModal = document.getElementById('moduleViewModal');
    const moduleChartModal = document.getElementById('moduleChartModal');
    const moduleRecordTitle = document.getElementById('moduleRecordTitle');
    const moduleDate = document.getElementById('moduleDate');
    const moduleTime = document.getElementById('moduleTime');
    const moduleSelect = document.getElementById('moduleSelect');
    const moduleAccuracy = document.getElementById('moduleAccuracy');
    const moduleError = document.getElementById('moduleError');
    const moduleRemark = document.getElementById('moduleRemark');
    const moduleRecordList = document.getElementById('moduleRecordList');
    const chartModuleSelect = document.getElementById('chartModule');
    const moduleChartCanvas = document.getElementById('moduleChartCanvas');
    const moduleChartNoData = document.getElementById('moduleChartNoData');

    // 考试相关
    const examMenuModal = document.getElementById('examMenuModal');
    const examRecordModal = document.getElementById('examRecordModal');
    const examViewModal = document.getElementById('examViewModal');
    const examChartModal = document.getElementById('examChartModal');
    const examRecordTitle = document.getElementById('examRecordTitle');
    const examDate = document.getElementById('examDate');
    const examTime = document.getElementById('examTime');
    const examScore = document.getElementById('examScore');
    const examError = document.getElementById('examError');
    const examRemark = document.getElementById('examRemark');
    const examRecordList = document.getElementById('examRecordList');
    const examScoreChartCanvas = document.getElementById('examScoreChart');
    const examModulesChartCanvas = document.getElementById('examModulesChart');
    const examChartNoData = document.getElementById('examChartNoData');
    const scoreChartContainer = document.getElementById('scoreChartContainer');
    const modulesChartContainer = document.getElementById('modulesChartContainer');

    let moduleChart = null;
    let examScoreChart = null;
    let examModulesChart = null;

    const ALL_MODULES = ['政治','常识','言语','数量','判断','资料'];

    // ---------- 计时 ----------
    let seconds = 0;
    let timerInterval = null;
    let isRunning = false;

    // ---------- Wake Lock ----------
    let wakeLock = null;
    let wakeLockSupported = 'wakeLock' in navigator;


    // ---------- 控制栏自动隐藏 ----------
    let hideTimeout = null;
    let cursorTimeout = null;

    function showControls() {
        controls.classList.add('visible');
        if (hideTimeout) clearTimeout(hideTimeout);
        // 触摸设备延长到 8 秒；鼠标设备 3 秒
        const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        const delay = isTouch ? 8000 : 3000;
        hideTimeout = setTimeout(() => controls.classList.remove('visible'), delay);
    }

    // ---------- 鼠标箭头自动隐藏 ----------
    function showCursor() {
        document.body.classList.remove('cursor-hidden');
        if (cursorTimeout) clearTimeout(cursorTimeout);
        // ⬇️ 2000 = 鼠标静止 2 秒后隐藏箭头，可自行调整
        cursorTimeout = setTimeout(() => {
            document.body.classList.add('cursor-hidden');
        }, 2000);
    }

    document.addEventListener('mousemove', () => {
        showControls();
        showCursor();
    });
    document.addEventListener('touchstart', showControls);

    // 鼠标离开窗口时也隐藏
    document.addEventListener('mouseleave', () => {
        document.body.classList.add('cursor-hidden');
    });

    // 鼠标悬停在控制栏上时不隐藏控制栏
    controls.addEventListener('mouseenter', () => {
        if (hideTimeout) clearTimeout(hideTimeout);
    });
    controls.addEventListener('mouseleave', showControls);

    setTimeout(showControls, 100);
    setTimeout(showCursor, 100);

    // ---------- 计时显示 ----------
    function formatTime(totalSec) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    function updateDisplay() { timerDisplay.textContent = formatTime(seconds); }
    function triggerBreath() {
        timerDisplay.classList.remove('breathing');
        void timerDisplay.offsetWidth;
        timerDisplay.classList.add('breathing');
    }
    setInterval(triggerBreath, 15000);
    setTimeout(triggerBreath, 500);

    // ---------- 屏幕常亮 ----------
    async function requestWakeLock() {
        if (!wakeLockSupported) { statusHint.textContent = '⚠️ 不支持常亮'; return false; }
        if (wakeLock) return true;
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                wakeLock = null;
                statusHint.textContent = '🔓 常亮已释放';
            });
            statusHint.textContent = '✅ 常亮已激活';
            return true;
        } catch (err) {
            statusHint.textContent = '❌ 常亮被拒 (需HTTPS)';
            return false;
        }
    }
    async function releaseWakeLock() {
        if (wakeLock) { try { await wakeLock.release(); } catch(e) {} wakeLock = null; }
        statusHint.textContent = '🔓 常亮已释放';
    }
    async function toggleTimer() {
        if (isRunning) {
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            isRunning = false;
            startBtn.textContent = '▶ 继续';
            startBtn.classList.add('paused');      // ⬅️ 新增
            await releaseWakeLock();
            statusHint.textContent = '⏸️ 已暂停 · 常亮已释放';
            return;
        }
        if (!wakeLock) await requestWakeLock();
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => { seconds++; updateDisplay(); }, 1000);
        isRunning = true;
        startBtn.textContent = '⏸ 暂停';
        startBtn.classList.remove('paused');       // ⬅️ 新增
        statusHint.textContent = '▶ 计时中 · 常亮启用';
    }
    async function resetTimer() {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        isRunning = false;
        seconds = 0;
        updateDisplay();
        startBtn.textContent = '▶ 开始';
        startBtn.classList.remove('paused');
        await releaseWakeLock();
        statusHint.textContent = '↺ 已重置 · 常亮已释放';
        showControls();
    }
    function toggleFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const el = document.documentElement;
            const req = el.requestFullscreen || el.webkitRequestFullscreen;
            if (req) {
                req.call(el).then(() => document.body.classList.add('is-fullscreen')).catch(() => {
                    statusHint.textContent = '⚠️ 全屏被拒';
                });
            }
        } else {
            const exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (exit) {
                exit.call(document).then(() => document.body.classList.remove('is-fullscreen'));
            }
        }
    }
    document.addEventListener('fullscreenchange', () => {
        const isFs = !!document.fullscreenElement;
        document.body.classList.toggle('is-fullscreen', isFs);
        fullscreenBtn.textContent = isFs ? '⛶ 退出' : '⛶ 全屏';
    });

    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && isRunning && wakeLockSupported && !wakeLock) {
            await requestWakeLock();
        }
    });

    // ---------- 通用：正确率自动计算 ----------
    function autoCalculateAccuracy(inputElement) {
        if (!inputElement) return;
        let val = inputElement.value.trim();
        if (!val) return;
        if (val.includes('/')) {
            const parts = val.split('/');
            if (parts.length === 2) {
                const num = parseFloat(parts[0]);
                const den = parseFloat(parts[1]);
                if (!isNaN(num) && !isNaN(den) && den !== 0) {
                    inputElement.value = (num / den * 100).toFixed(1) + '%';
                    return;
                }
            }
        }
        if (!val.includes('%')) {
            const num = parseFloat(val);
            if (!isNaN(num)) inputElement.value = num + '%';
        }
    }
    moduleAccuracy.addEventListener('blur', function() { autoCalculateAccuracy(this); });
    document.querySelectorAll('.exam-accuracy').forEach(input => {
        input.addEventListener('blur', function() { autoCalculateAccuracy(this); });
    });

    // ---------- 通用：导出辅助 ----------
    function escapeCsvField(field) {
        if (field === null || field === undefined) return '""';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob(['\uFEFF' + content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }
    function parseAccuracy(accStr) {
        if (!accStr) return 0;
        let num = parseFloat(String(accStr).trim().replace('%',''));
        return isNaN(num) ? 0 : num;
    }

    // ==================== 模块菜单 ====================
    function openModuleMenu() { moduleMenuModal.classList.add('active'); showControls(); }
    function closeModuleMenu() { moduleMenuModal.classList.remove('active'); }

    // ==================== 模块记录 ====================
    const MODULE_STORAGE = 'timerRecords';
    function getModuleRecords() {
        try { return JSON.parse(localStorage.getItem(MODULE_STORAGE)) || []; } catch { return []; }
    }
    function saveModuleRecords(r) { localStorage.setItem(MODULE_STORAGE, JSON.stringify(r)); }

    let editingModuleTimestamp = null;

    function openModuleRecordModal(recordData = null) {
        if (recordData) {
            editingModuleTimestamp = recordData.timestamp;
            moduleRecordTitle.textContent = '✏️ 编辑模块记录';
            moduleDate.value = recordData.date || '';
            moduleTime.value = recordData.timeUsed || '';
            moduleSelect.value = recordData.module || '常识';
            moduleAccuracy.value = recordData.accuracy || '';
            moduleError.value = recordData.errorReason || '';
            moduleRemark.value = recordData.remark || '';
        } else {
            editingModuleTimestamp = null;
            moduleRecordTitle.textContent = '📝 模块记录';
            const now = new Date();
            moduleDate.value = now.toLocaleString('zh-CN', { hour12: false });
            moduleTime.value = formatTime(seconds);
            moduleAccuracy.value = '';
            moduleError.value = '';
            moduleRemark.value = '';
        }
        moduleRecordModal.classList.add('active');
        showControls();
    }
    function closeModuleRecordModal() {
        moduleRecordModal.classList.remove('active');
        editingModuleTimestamp = null;
    }

    function saveModuleRecord() {
        const date = moduleDate.value.trim() || '未知日期';
        const timeUsed = moduleTime.value.trim() || '00:00:00';
        const module = moduleSelect.value;
        let accuracy = moduleAccuracy.value.trim() || '未填写';
        const errorReason = moduleError.value.trim() || '无';
        const remark = moduleRemark.value.trim() || '无';

        let records = getModuleRecords();
        if (editingModuleTimestamp !== null) {
            const idx = records.findIndex(r => r.timestamp === editingModuleTimestamp);
            if (idx !== -1) {
                records[idx] = { ...records[idx], date, timeUsed, module, accuracy, errorReason, remark };
                saveModuleRecords(records);
                statusHint.textContent = '✅ 记录已更新';
            } else {
                alert('记录不存在'); closeModuleRecordModal(); return;
            }
        } else {
            records.push({ date, timeUsed, module, accuracy, errorReason, remark, timestamp: Date.now() });
            saveModuleRecords(records);
            statusHint.textContent = '✅ 记录已保存';
        }
        closeModuleRecordModal();
        if (moduleViewModal.classList.contains('active')) renderModuleRecords();
        setTimeout(() => {
            statusHint.textContent = isRunning ? '▶ 计时中 · 常亮启用' : '⏸️ 已暂停 · 常亮已释放';
        }, 2000);
    }

    function openModuleViewModal() { renderModuleRecords(); moduleViewModal.classList.add('active'); showControls(); }
    function closeModuleViewModal() { moduleViewModal.classList.remove('active'); }

    function renderModuleRecords() {
        const records = getModuleRecords();
        if (records.length === 0) {
            moduleRecordList.innerHTML = `<div class="no-records">📭 暂无记录</div>`;
            return;
        }
        const sorted = [...records].reverse();
        let html = '';
        sorted.forEach(rec => {
            html += `
                <div class="record-item">
                    <div class="summary">
                        <span class="date">${rec.date}</span>
                        <span class="time">⏱ ${rec.timeUsed}</span>
                        <span class="module">${rec.module}</span>
                        <span class="accuracy">${rec.accuracy}</span>
                        <div class="actions">
                            <button class="edit-btn" data-timestamp="${rec.timestamp}">✏️ 编辑</button>
                            <button class="del-btn" data-timestamp="${rec.timestamp}">🗑 删除</button>
                        </div>
                    </div>
                    <div class="detail">
                        <div><span class="label">❌ 错误原因：</span>${rec.errorReason}</div>
                        <div><span class="label">📝 备注：</span>${rec.remark}</div>
                    </div>
                </div>`;
        });
        moduleRecordList.innerHTML = html;
        moduleRecordList.querySelectorAll('.record-item').forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.closest('.edit-btn') || e.target.closest('.del-btn')) return;
                this.classList.toggle('expanded');
            });
        });
        moduleRecordList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const ts = parseInt(this.dataset.timestamp);
                const rec = getModuleRecords().find(r => r.timestamp === ts);
                if (rec) { closeModuleViewModal(); openModuleRecordModal(rec); }
            });
        });
        moduleRecordList.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const ts = parseInt(this.dataset.timestamp);
                if (!confirm('确定删除这条记录吗？')) return;
                let records = getModuleRecords();
                records = records.filter(r => r.timestamp !== ts);
                saveModuleRecords(records);
                renderModuleRecords();
                statusHint.textContent = '🗑 已删除';
                setTimeout(() => {
                    statusHint.textContent = isRunning ? '▶ 计时中 · 常亮启用' : '⏸️ 已暂停 · 常亮已释放';
                }, 2000);
            });
        });
    }

    function exportModuleRecords(format) {
        const records = getModuleRecords();
        if (records.length === 0) { alert('暂无记录可导出'); return; }
        const headers = ['日期','用时','模块','正确率','错误原因','备注'];
        const rows = records.map(r => [r.date, r.timeUsed, r.module, r.accuracy, r.errorReason, r.remark]);
        const content = [headers.map(escapeCsvField).join(','), ...rows.map(r => r.map(escapeCsvField).join(','))].join('\n');
        const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;';
        downloadFile(content, `module_records_${new Date().toISOString().slice(0,10)}.${format}`, mime);
        statusHint.textContent = `📤 已导出 ${format.toUpperCase()}`;
        setTimeout(() => {
            statusHint.textContent = isRunning ? '▶ 计时中 · 常亮启用' : '⏸️ 已暂停 · 常亮已释放';
        }, 2000);
    }
    function clearAllModuleRecords() {
        if (confirm('确定要删除所有模块记录吗？')) {
            saveModuleRecords([]); renderModuleRecords();
            statusHint.textContent = '🗑 已清空';
            setTimeout(() => {
                statusHint.textContent = isRunning ? '▶ 计时中 · 常亮启用' : '⏸️ 已暂停 · 常亮已释放';
            }, 2000);
        }
    }

    // ---------- 模块图表 ----------
    function openModuleChartModal() { moduleChartModal.classList.add('active'); showControls(); generateModuleChart(); }
    function closeModuleChartModal() {
        moduleChartModal.classList.remove('active');
        if (moduleChart) { moduleChart.destroy(); moduleChart = null; }
    }
    function generateModuleChart() {
        const module = chartModuleSelect.value;
        const records = getModuleRecords();
        const filtered = records.filter(r => r.module === module).sort((a,b) => a.timestamp - b.timestamp);
        if (filtered.length === 0) {
            moduleChartNoData.style.display = 'block';
            if (moduleChart) { moduleChart.destroy(); moduleChart = null; }
            return;
        }
        moduleChartNoData.style.display = 'none';
        const labels = filtered.map((_, i) => `第${i+1}次`);
        const data = filtered.map(r => parseAccuracy(r.accuracy));
        const dateTimes = filtered.map(r => r.date);
        if (moduleChart) { moduleChart.destroy(); moduleChart = null; }
        const ctx = moduleChartCanvas.getContext('2d');
        moduleChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: `${module} 正确率`,
                    data,
                    borderColor: '#7af',
                    backgroundColor: 'rgba(100,180,255,0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: '#7af',
                    pointBorderColor: '#fff',
                    pointRadius: 3, tension: 0.2, fill: true,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#eee', font: { family: 'Courier New', size: 12 } } },
                    tooltip: {
                        callbacks: {
                            label: c => `正确率: ${c.parsed.y}%`,
                            afterLabel: c => `📅 ${dateTimes[c.dataIndex] || ''}`
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: '#aaa', maxTicksLimit: 20, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#aaa', callback: v => v + '%', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, max: 100 }
                }
            }
        });
    }

    // ==================== 考试 ====================
    const EXAM_STORAGE = 'examRecords';
    function getExamRecords() {
        try { return JSON.parse(localStorage.getItem(EXAM_STORAGE)) || []; } catch { return []; }
    }
    function saveExamRecords(r) { localStorage.setItem(EXAM_STORAGE, JSON.stringify(r)); }

    let editingExamTimestamp = null;

    function openExamMenu() { examMenuModal.classList.add('active'); showControls(); }
    function closeExamMenu() { examMenuModal.classList.remove('active'); }

    function openExamRecordModal(recordData = null) {
        if (recordData) {
            editingExamTimestamp = recordData.timestamp;
            examRecordTitle.textContent = '✏️ 编辑考试记录';
            examDate.value = recordData.date || '';
            examTime.value = recordData.timeUsed || '';
            const accs = recordData.accuracies || {};
            document.querySelectorAll('.exam-accuracy').forEach(input => {
                const mod = input.dataset.module;
                input.value = accs[mod] || '';
            });
            examScore.value = recordData.score || '';
            examError.value = recordData.errorReason || '';
            examRemark.value = recordData.remark || '';
        } else {
            editingExamTimestamp = null;
            examRecordTitle.textContent = '📝 考试记录';
            const now = new Date();
            examDate.value = now.toLocaleString('zh-CN', { hour12: false });
            examTime.value = formatTime(seconds);
            document.querySelectorAll('.exam-accuracy').forEach(input => input.value = '');
            examScore.value = '';
            examError.value = '';
            examRemark.value = '';
        }
        examRecordModal.classList.add('active');
        showControls();
    }
    function closeExamRecordModal() {
        examRecordModal.classList.remove('active');
        editingExamTimestamp = null;
    }

    function saveExamRecord() {
        const date = examDate.value.trim() || '未知日期';
        const timeUsed = examTime.value.trim() || '00:00:00';
        const accuracies = {};
        document.querySelectorAll('.exam-accuracy').forEach(input => {
            const mod = input.dataset.module;
            accuracies[mod] = input.value.trim() || '未填写';
        });
        const score = examScore.value.trim() || '未填写';
        const errorReason = examError.value.trim() || '无';
        const remark = examRemark.value.trim() || '无';

        let records = getExamRecords();
        if (editingExamTimestamp !== null) {
            const idx = records.findIndex(r => r.timestamp === editingExamTimestamp);
            if (idx !== -1) {
                records[idx] = { ...records[idx], date, timeUsed, accuracies, score, errorReason, remark };
                saveExamRecords(records);
                statusHint.textContent = '✅ 考试记录已更新';
            } else {
                alert('记录不存在'); closeExamRecordModal(); return;
            }
        } else {
            records.push({ date, timeUsed, accuracies, score, errorReason, remark, timestamp: Date.now() });
            saveExamRecords(records);
            statusHint.textContent = '✅ 考试记录已保存';
        }
        closeExamRecordModal();
        if (examViewModal.classList.contains('active')) renderExamRecords();
        setTimeout(() => {
            statusHint.textContent = isRunning ? '▶ 计时中 · 常亮启用' : '⏸️ 已暂停 · 常亮已释放';
        }, 2000);
    }

    function openExamViewModal() { renderExamRecords(); examViewModal.classList.add('active'); showControls(); }
    function closeExamViewModal() { examViewModal.classList.remove('active'); }

    function renderExamRecords() {
        const records = getExamRecords();
        if (records.length === 0) {
            examRecordList.innerHTML = `<div class="no-records">📭 暂无考试记录</div>`;
            return;
        }
        const sorted = [...records].reverse();
        let html = '';
        sorted.forEach(rec => {
            const accs = rec.accuracies || {};
            const values = ALL_MODULES.map(m => parseAccuracy(accs[m])).filter(v => v !== 0 || accs[m]);
            const avg = values.length ? (values.reduce((a,b) => a+b, 0) / values.length).toFixed(1) + '%' : '—';

            let accHtml = '';
            ALL_MODULES.forEach(m => {
                const val = accs[m] || '—';
                accHtml += `<span style="margin-right:12px;">${m}: <b style="color:#8f8;">${val}</b></span>`;
            });

            html += `
                <div class="record-item" data-timestamp="${rec.timestamp}">
                    <div class="summary">
                        <span class="date">${rec.date}</span>
                        <span class="time">⏱ ${rec.timeUsed}</span>
                        <span class="score">🎯 ${rec.score}</span>
                        <span class="accuracy">均 ${avg}</span>
                        <div class="actions">
                            <button class="edit-btn" data-timestamp="${rec.timestamp}">✏️ 编辑</button>
                            <button class="del-btn" data-timestamp="${rec.timestamp}">🗑 删除</button>
                        </div>
                    </div>
                    <div class="detail">
                        <div style="margin-bottom:6px;">${accHtml}</div>
                        <div><span class="label">❌ 错误原因：</span>${rec.errorReason}</div>
                        <div><span class="label">📝 备注：</span>${rec.remark}</div>
                    </div>
                </div>`;
        });
        examRecordList.innerHTML = html;

        examRecordList.querySelectorAll('.record-item').forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.closest('.edit-btn') || e.target.closest('.del-btn')) return;
                this.classList.toggle('expanded');
            });
        });
        examRecordList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const ts = parseInt(this.dataset.timestamp);
                const rec = getExamRecords().find(r => r.timestamp === ts);
                if (rec) { closeExamViewModal(); openExamRecordModal(rec); }
            });
        });
        examRecordList.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const ts = parseInt(this.dataset.timestamp);
                if (!confirm('确定删除这条考试记录吗？')) return;
                let records = getExamRecords();
                records = records.filter(r => r.timestamp !== ts);
                saveExamRecords(records);
                renderExamRecords();
                statusHint.textContent = '🗑 已删除';
                setTimeout(() => {
                    statusHint.textContent = isRunning ? '▶ 计时中 · 常亮启用' : '⏸️ 已暂停 · 常亮已释放';
                }, 2000);
            });
        });
    }

    function exportExamRecords(format) {
        const records = getExamRecords();
        if (records.length === 0) { alert('暂无考试记录可导出'); return; }
        const headers = ['日期','用时','政治','常识','言语','数量','判断','资料','最终得分','错误原因','备注'];
        const rows = records.map(r => {
            const accs = r.accuracies || {};
            return [
                r.date, r.timeUsed,
                accs['政治'] || '',accs['常识'] || '', accs['言语'] || '', 
                accs['数量'] || '',accs['判断'] || '', accs['资料'] || '',
                r.score, r.errorReason, r.remark
            ];
        });
        const content = [headers.map(escapeCsvField).join(','), ...rows.map(r => r.map(escapeCsvField).join(','))].join('\n');
        const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;';
        downloadFile(content, `exam_records_${new Date().toISOString().slice(0,10)}.${format}`, mime);
        statusHint.textContent = `📤 已导出考试记录 ${format.toUpperCase()}`;
        setTimeout(() => {
            statusHint.textContent = isRunning ? '▶ 计时中 · 常亮启用' : '⏸️ 已暂停 · 常亮已释放';
        }, 2000);
    }
    function clearAllExamRecords() {
        if (confirm('确定要删除所有考试记录吗？')) {
            saveExamRecords([]); renderExamRecords();
            statusHint.textContent = '🗑 已清空考试记录';
            setTimeout(() => {
                statusHint.textContent = isRunning ? '▶ 计时中 · 常亮启用' : '⏸️ 已暂停 · 常亮已释放';
            }, 2000);
        }
    }

    // ---------- 考试图表 ----------
    function openExamChartModal() {
        examChartModal.classList.add('active');
        showControls();
        // 默认显示分数图表
        document.querySelectorAll('.chart-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'score'));
        scoreChartContainer.style.display = 'block';
        modulesChartContainer.style.display = 'none';
        generateExamCharts();
    }
    function closeExamChartModal() {
        examChartModal.classList.remove('active');
        if (examScoreChart) { examScoreChart.destroy(); examScoreChart = null; }
        if (examModulesChart) { examModulesChart.destroy(); examModulesChart = null; }
    }

    function generateExamCharts() {
        const records = getExamRecords();
        if (records.length === 0) {
            examChartNoData.style.display = 'block';
            scoreChartContainer.style.display = 'none';
            modulesChartContainer.style.display = 'none';
            return;
        }
        examChartNoData.style.display = 'none';
        const sorted = [...records].sort((a,b) => a.timestamp - b.timestamp);
        const labels = sorted.map((_, i) => `第${i+1}次`);
        const dateTimes = sorted.map(r => r.date);

        // -------- 分数图表 --------
        const scoreData = sorted.map(r => {
            const s = parseFloat(String(r.score).replace('%',''));
            return isNaN(s) ? null : s;
        });

        if (examScoreChart) { examScoreChart.destroy(); examScoreChart = null; }
        const ctx1 = examScoreChartCanvas.getContext('2d');
        examScoreChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: '考试分数',
                    data: scoreData,
                    borderColor: '#ff6',
                    backgroundColor: 'rgba(255,255,100,0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: '#ff6',
                    pointBorderColor: '#fff',
                    pointRadius: 4, tension: 0.2, fill: true,
                    spanGaps: true,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#eee', font: { family: 'Courier New', size: 12 } } },
                    tooltip: {
                        callbacks: {
                            label: c => `分数: ${c.parsed.y}`,
                            afterLabel: c => `📅 ${dateTimes[c.dataIndex] || ''}`
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: '#aaa', maxTicksLimit: 20, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#aaa', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: false }
                }
            }
        });

        // -------- 模块正确率图表（每个模块一条线） --------
        const colors = {
            '政治': '#60a5fa',
            '常识': '#ff6b6b',
            '言语': '#4ecdc4',
            '数量': '#ffe66d',
            '判断': '#a78bfa',
            '资料': '#f472b6'
        };
        const datasets = ALL_MODULES.map(mod => ({
            label: mod,
            data: sorted.map(r => {
                const v = parseAccuracy((r.accuracies || {})[mod]);
                return v || null;
            }),
            borderColor: colors[mod],
            backgroundColor: colors[mod] + '22',
            borderWidth: 2,
            pointBackgroundColor: colors[mod],
            pointBorderColor: '#fff',
            pointRadius: 3,
            tension: 0.2,
            fill: false,
            spanGaps: true,
        }));

        if (examModulesChart) { examModulesChart.destroy(); examModulesChart = null; }
        const ctx2 = examModulesChartCanvas.getContext('2d');
        examModulesChart = new Chart(ctx2, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#eee', font: { family: 'Courier New', size: 12 }, boxWidth: 14 } },
                    tooltip: {
                        callbacks: {
                            label: c => `${c.dataset.label}: ${c.parsed.y}%`,
                            afterLabel: c => `📅 ${dateTimes[c.dataIndex] || ''}`
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: '#aaa', maxTicksLimit: 20, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#aaa', callback: v => v + '%', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, max: 100 }
                }
            }
        });
    }

    // ==================== 设置 / 导入导出 / Gist 同步 ====================
    const SETTINGS_STORAGE = 'appSettings';
    function getAppSettings() {
        try { return JSON.parse(localStorage.getItem(SETTINGS_STORAGE)) || {}; } catch { return {}; }
    }
    function saveAppSettings(s) { localStorage.setItem(SETTINGS_STORAGE, JSON.stringify(s)); }

    const settingsModal = document.getElementById('settingsModal');
    const gistTokenInput = document.getElementById('gistToken');
    const gistIdInput = document.getElementById('gistId');
    const gistStatusDiv = document.getElementById('gistStatus');
    const importFileInput = document.getElementById('importFileInput');

    function setGistStatus(msg, type) {
        gistStatusDiv.textContent = msg;
        gistStatusDiv.className = 'gist-status' + (type ? ' ' + type : '');
    }

    // 收集全部数据
    function collectAllData() {
        return {
            version: 1,
            app: 'burn-in-timer',
            exportedAt: new Date().toISOString(),
            moduleRecords: getModuleRecords(),
            examRecords: getExamRecords()
        };
    }

    // 打开设置页
    function openSettings() {
        const s = getAppSettings();
        if (gistTokenInput && s.gistToken) gistTokenInput.value = s.gistToken;
        if (gistIdInput && s.gistId) gistIdInput.value = s.gistId;

        if (s.lastSync) {
            const t = new Date(s.lastSync).toLocaleString('zh-CN', { hour12: false });
            setGistStatus(`✅ 上次同步：${t}`, 'ok');
        } else {
            setGistStatus('未同步');
        }
        settingsModal.classList.add('active');
        showControls();
    }
    function closeSettings() { settingsModal.classList.remove('active'); }

    // 导出全部数据为 JSON
    function exportAllData() {
        const data = collectAllData();
        if (data.moduleRecords.length === 0 && data.examRecords.length === 0) {
            setGistStatus('⚠️ 暂无数据可导出', 'err');
            return;
        }
        const json = JSON.stringify(data, null, 2);
        downloadFile(json, `timer_backup_${new Date().toISOString().slice(0,10)}.json`, 'application/json;charset=utf-8;');
        setGistStatus(`✅ 已导出（模块 ${data.moduleRecords.length} 条，考试 ${data.examRecords.length} 条）`, 'ok');
    }

    // 导入数据（替换）
    function importDataFromJson(jsonStr) {
        let data;
        try { data = JSON.parse(jsonStr); } catch { setGistStatus('❌ 文件格式错误', 'err'); return; }
        if (!data || typeof data !== 'object') { setGistStatus('❌ 数据无效', 'err'); return; }

        const modCount = Array.isArray(data.moduleRecords) ? data.moduleRecords.length : 0;
        const examCount = Array.isArray(data.examRecords) ? data.examRecords.length : 0;

        if (!confirm(`确认导入并替换现有数据？\n\n模块记录：${modCount} 条\n考试记录：${examCount} 条\n\n此操作不可撤销，当前数据将被覆盖。`)) return;

        if (Array.isArray(data.moduleRecords)) saveModuleRecords(data.moduleRecords);
        if (Array.isArray(data.examRecords)) saveExamRecords(data.examRecords);

        setGistStatus('✅ 导入成功，即将刷新页面...', 'ok');
        setTimeout(() => location.reload(), 900);
    }

    // 查找用户已有的备份 Gist
    async function findExistingBackupGist(token) {
        try {
            const res = await fetch('https://api.github.com/gists?per_page=100', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json'
                }
            });
            if (!res.ok) return null;
            const gists = await res.json();
            // 优先匹配描述 + 文件名
            let target = gists.find(g =>
                g.description === '防烧屏计时器 · 数据备份' &&
                g.files && g.files['timer_data.json']
            );
            // 其次只匹配文件名
            if (!target) {
                target = gists.find(g => g.files && g.files['timer_data.json']);
            }
            return target ? target.id : null;
        } catch (e) {
            console.warn('查找 Gist 失败:', e);
            return null;
        }
    }

    // 智能双向同步
    async function syncToGist(options = {}) {
        const silent = options.silent === true;
        const token = gistTokenInput.value.trim();
        if (!token) {
            if (!silent) setGistStatus('❌ 请填写 GitHub Token', 'err');
            return;
        }

        const s = getAppSettings();
        s.gistToken = token;
        saveAppSettings(s);

        let gistId = (gistIdInput.value.trim()) || s.gistId || '';

        if (!gistId) {
            setGistStatus('⏳ 查找已有备份...', 'loading');
            gistId = await findExistingBackupGist(token);
            if (gistId) {
                gistIdInput.value = gistId;
                s.gistId = gistId;
                saveAppSettings(s);
            }
        }

        const localData = collectAllData();
        const localCount = localData.moduleRecords.length + localData.examRecords.length;

        try {
            // 拉取远程
            let remoteData = null;
            if (gistId) {
                setGistStatus('⏳ 读取远程数据...', 'loading');
                try {
                    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/vnd.github+json'
                        }
                    });
                    if (res.ok) {
                        const result = await res.json();
                        const file = result.files && result.files['timer_data.json'];
                        if (file) {
                            let content = file.truncated && file.raw_url
                                ? await (await fetch(file.raw_url)).text()
                                : file.content;
                            remoteData = JSON.parse(content);
                        }
                    }
                } catch (e) { console.warn('拉取远程失败:', e); }
            }

            const remoteCount = remoteData
                ? (remoteData.moduleRecords?.length || 0) + (remoteData.examRecords?.length || 0)
                : 0;

            // ============ 静默模式：只拉取，不合并不上传 ============
            if (silent) {
                if (localCount === 0 && remoteCount > 0) {
                    // 本地空 → 自动下载
                    if (Array.isArray(remoteData.moduleRecords)) saveModuleRecords(remoteData.moduleRecords);
                    if (Array.isArray(remoteData.examRecords)) saveExamRecords(remoteData.examRecords);
                    const s3 = getAppSettings();
                    s3.lastSync = Date.now();
                    saveAppSettings(s3);
                    setTimeout(() => location.reload(), 500);
                } else if (localCount > 0 && remoteCount > localCount) {
                    // 远程比本地多 → 静默提示用户手动同步
                    setGistStatus(`ℹ️ 远程有 ${remoteCount} 条，本地 ${localCount} 条，建议手动同步`, 'ok');
                }
                return;
            }

            // ============ 手动模式：原有逻辑 ============
            let finalData;
            if (localCount === 0 && remoteCount > 0) {
                if (!confirm(`本地无数据，远程有 ${remoteCount} 条。\n\n是否从远程下载到本地？`)) {
                    setGistStatus('已取消');
                    return;
                }
                if (Array.isArray(remoteData.moduleRecords)) saveModuleRecords(remoteData.moduleRecords);
                if (Array.isArray(remoteData.examRecords)) saveExamRecords(remoteData.examRecords);
                const s3 = getAppSettings();
                s3.lastSync = Date.now();
                saveAppSettings(s3);
                setGistStatus(`✅ 已下载 ${remoteCount} 条，即将刷新...`, 'ok');
                setTimeout(() => location.reload(), 900);
                return;
            } else if (localCount > 0 && remoteCount > 0) {
                finalData = mergeData(localData, remoteData);
                saveModuleRecords(finalData.moduleRecords);
                saveExamRecords(finalData.examRecords);
            } else {
                finalData = localData;
            }

            // ========== 3. 上传 ==========
            setGistStatus('⏳ 上传中...', 'loading');
            const body = {
                description: '防烧屏计时器 · 数据备份',
                files: { 'timer_data.json': { content: JSON.stringify(finalData, null, 2) } }
            };
            if (!gistId) body.public = false;

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github+json'
            };
            const res = gistId
                ? await fetch(`https://api.github.com/gists/${gistId}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
                : await fetch('https://api.github.com/gists', { method: 'POST', headers, body: JSON.stringify(body) });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `HTTP ${res.status}`);
            }
            const result = await res.json();

            const s2 = getAppSettings();
            s2.gistToken = token;
            s2.gistId = result.id;
            s2.lastSync = Date.now();
            saveAppSettings(s2);

            const total = finalData.moduleRecords.length + finalData.examRecords.length;
            setGistStatus(`✅ 同步成功（共 ${total} 条）\n上次同步：${new Date().toLocaleString('zh-CN', { hour12: false })}`, 'ok');
        } catch (e) {
            setGistStatus(`❌ 同步失败：${e.message}`, 'err');
        }
    }

    // 合并去重：按 timestamp 唯一
    function mergeData(local, remote) {
        const merge = (a, b) => {
            const map = new Map();
            [...(a || []), ...(b || [])].forEach(r => {
                if (r && r.timestamp) map.set(r.timestamp, r);
            });
            return [...map.values()].sort((x, y) => x.timestamp - y.timestamp);
        };
        return {
            version: 1,
            app: 'burn-in-timer',
            exportedAt: new Date().toISOString(),
            moduleRecords: merge(local.moduleRecords, remote.moduleRecords),
            examRecords: merge(local.examRecords, remote.examRecords)
        };
    }

    // 触发文件选择
    function triggerImportFile() { importFileInput.click(); }

    // 处理选择文件
    function handleImportFile(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => importDataFromJson(ev.target.result);
        reader.readAsText(file, 'utf-8');
        e.target.value = ''; // 允许重复选择同一文件
    }

    // ==================== 事件绑定 ====================
    startBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    document.getElementById('moduleBtn').addEventListener('click', openModuleMenu);
    document.getElementById('examBtn').addEventListener('click', openExamMenu);

    // 模块菜单
    document.getElementById('closeModuleMenu').addEventListener('click', closeModuleMenu);
    document.getElementById('moduleRecordBtn').addEventListener('click', () => { closeModuleMenu(); openModuleRecordModal(null); });
    document.getElementById('moduleViewBtn').addEventListener('click', () => { closeModuleMenu(); openModuleViewModal(); });
    document.getElementById('moduleChartBtn').addEventListener('click', () => { closeModuleMenu(); openModuleChartModal(); });

    // 考试菜单
    document.getElementById('closeExamMenu').addEventListener('click', closeExamMenu);
    document.getElementById('examRecordBtn').addEventListener('click', () => { closeExamMenu(); openExamRecordModal(null); });
    document.getElementById('examViewBtn').addEventListener('click', () => { closeExamMenu(); openExamViewModal(); });
    document.getElementById('examChartBtn').addEventListener('click', () => { closeExamMenu(); openExamChartModal(); });

    // 模块记录表单
    document.getElementById('closeModuleRecord').addEventListener('click', closeModuleRecordModal);
    document.getElementById('cancelModuleRecord').addEventListener('click', closeModuleRecordModal);
    document.getElementById('saveModuleRecord').addEventListener('click', saveModuleRecord);

    // 模块查看记录
    document.getElementById('closeModuleView').addEventListener('click', closeModuleViewModal);
    document.getElementById('clearModuleRecords').addEventListener('click', clearAllModuleRecords);
    document.getElementById('exportModuleCsv').addEventListener('click', () => exportModuleRecords('csv'));
    document.getElementById('exportModuleTxt').addEventListener('click', () => exportModuleRecords('txt'));

    // 模块图表
    document.getElementById('closeModuleChart').addEventListener('click', closeModuleChartModal);
    chartModuleSelect.addEventListener('change', generateModuleChart);

    // 考试记录表单
    document.getElementById('closeExamRecord').addEventListener('click', closeExamRecordModal);
    document.getElementById('cancelExamRecord').addEventListener('click', closeExamRecordModal);
    document.getElementById('saveExamRecord').addEventListener('click', saveExamRecord);

    // 查看考试记录
    document.getElementById('closeExamView').addEventListener('click', closeExamViewModal);
    document.getElementById('clearExamRecords').addEventListener('click', clearAllExamRecords);
    document.getElementById('exportExamCsv').addEventListener('click', () => exportExamRecords('csv'));
    document.getElementById('exportExamTxt').addEventListener('click', () => exportExamRecords('txt'));

    // 考试图表
    document.getElementById('closeExamChart').addEventListener('click', closeExamChartModal);
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            if (this.dataset.tab === 'score') {
                scoreChartContainer.style.display = 'block';
                modulesChartContainer.style.display = 'none';
                if (examScoreChart) examScoreChart.resize();
            } else {
                scoreChartContainer.style.display = 'none';
                modulesChartContainer.style.display = 'block';
                if (examModulesChart) examModulesChart.resize();
            }
        });
    });

    // 设置页
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettings').addEventListener('click', closeSettings);
    document.getElementById('exportAllBtn').addEventListener('click', exportAllData);
    document.getElementById('importAllBtn').addEventListener('click', triggerImportFile);
    importFileInput.addEventListener('change', handleImportFile);
    document.getElementById('syncGistBtn').addEventListener('click', syncToGist);
    settingsModal.addEventListener('click', e => { if (e.target === settingsModal) closeSettings(); });

    // Token / Gist ID 一改动就保存到 localStorage
    gistTokenInput.addEventListener('input', () => {
        const s = getAppSettings();
        s.gistToken = gistTokenInput.value.trim();
        saveAppSettings(s);
    });
    gistIdInput && gistIdInput.addEventListener('input', () => {
        const s = getAppSettings();
        s.gistId = gistIdInput.value.trim();
        saveAppSettings(s);
    });

    // 点击遮罩关闭
    moduleMenuModal.addEventListener('click', e => { if (e.target === moduleMenuModal) closeModuleMenu(); });
    moduleRecordModal.addEventListener('click', e => { if (e.target === moduleRecordModal) closeModuleRecordModal(); });
    moduleViewModal.addEventListener('click', e => { if (e.target === moduleViewModal) closeModuleViewModal(); });
    moduleChartModal.addEventListener('click', e => { if (e.target === moduleChartModal) closeModuleChartModal(); });
    examMenuModal.addEventListener('click', e => { if (e.target === examMenuModal) closeExamMenu(); });
    examRecordModal.addEventListener('click', e => { if (e.target === examRecordModal) closeExamRecordModal(); });
    examViewModal.addEventListener('click', e => { if (e.target === examViewModal) closeExamViewModal(); });
    examChartModal.addEventListener('click', e => { if (e.target === examChartModal) closeExamChartModal(); });

    window.addEventListener('beforeunload', () => {
        if (wakeLock) wakeLock.release().catch(() => {});
        if (moduleChart) moduleChart.destroy();
        if (examScoreChart) examScoreChart.destroy();
        if (examModulesChart) examModulesChart.destroy();
    });

    // ---------- 启动 ----------
    updateDisplay();
    // 页面加载时预填 Gist 设置
    (function preloadGistSettings() {
        const s = getAppSettings();
        if (s.gistToken) gistTokenInput.value = s.gistToken;
        if (s.gistId) gistIdInput && (gistIdInput.value = s.gistId);
    })();

    statusHint.textContent = wakeLockSupported ? '⚡ 自动常亮' : '⚠️ 仅计时 (无常亮)';
    console.log('✅ 防烧屏计时器 (模块+考试+图表) 已启动');
    // ⭐ 每次打开页面自动静默同步一次（仅当有 Token 时）
    setTimeout(() => {
        const s = getAppSettings();
        if (s.gistToken) {
            syncToGist({ silent: true });
        }
    }, 800);
})();