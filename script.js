// =====================================================
// เทศบาลเมืองอ่างศิลา - script.js
// =====================================================

// ---------- Slider Logic ----------
let currentSlide = 0;
const totalSlides = 3;
const slider = document.getElementById('slider');
const dots = document.querySelectorAll('.dot');

function updateSlider() {
  if (!slider) return;
  slider.style.transform = `translateX(-${currentSlide * 100}%)`;
  dots.forEach((dot, index) => {
    if (index === currentSlide) {
      dot.classList.replace('bg-white/40', 'bg-white/70');
    } else {
      dot.classList.replace('bg-white/70', 'bg-white/40');
    }
  });
}

function goToSlide(index) {
  currentSlide = index;
  updateSlider();
}

if (slider) {
  setInterval(() => {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlider();
  }, 4000);
}

// ---------- Back To Top Button ----------
const topBtn = document.getElementById('top');
if (topBtn) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      topBtn.classList.add('show');
    } else {
      topBtn.classList.remove('show');
    }
  });
  topBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// =====================================================
// ระบบเชื่อมต่อ Google Sheets สู่ Dashboard (แยกแท็บตามกอง)
// =====================================================
const SHEET_ID = '1Xk7ifeRnI1M8M3fXmBtStrBYU0G0tg6azvP8c6JU-uc';

let currentSheetData = []; // เพิ่มตัวแปรเก็บข้อมูลชั่วคราว เพื่อไม่ต้องโหลดใหม่เมื่อเปลี่ยนปี

async function fetchDashboardData() {
  const tabName = document.getElementById('dept-select').value;
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;

  document.getElementById('dash-loading').classList.remove('hidden');
  tableBody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดข้อมูล...</td></tr>`;

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${tabName}`;

  try {
    const response = await fetch(url);
    const text = await response.text();

    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonString);

    const cols = data.table.cols.map(c => c ? c.label : '');

    const rows = data.table.rows.map(r => {
      const rowObj = {};
      r.c.forEach((cell, i) => {
        rowObj[cols[i]] = cell ? (cell.f !== undefined ? cell.f : cell.v) : '';
      });
      return rowObj;
    });

    currentSheetData = rows; // เก็บข้อมูลที่ดึงมาเข้าตัวแปร
    filterData(); // โหลดเสร็จให้เรียกฟังก์ชันกรองข้อมูล

  } catch (error) {
    console.error('Error fetching sheet:', error);
    tableBody.innerHTML = `<tr><td colspan="5" class="px-4 py-5 text-center text-red-500 font-bold">ไม่พบข้อมูล หรือยังไม่ได้สร้างแท็บชื่อ "${tabName}"<br><span class="text-sm font-normal text-gray-500">กรุณาตรวจสอบชื่อแถบด้านล่างของ Google Sheet ให้ตรงกับค่าใน Dropdown</span></td></tr>`;

    resetCounters();
  } finally {
    document.getElementById('dash-loading').classList.add('hidden');
  }
}

// ฟังก์ชันกรองข้อมูลตาม "ปีงบประมาณ"
function filterData() {
  const selectedYear = document.getElementById('year-select').value;

  let filteredData = currentSheetData;

  if (selectedYear !== 'all') {
    filteredData = currentSheetData.filter(item => {
      // ดึงปีงบประมาณจากคอลัมน์ "เลขที่" เช่น '02/2569'
      const docNum = (item['เลขที่'] || '').toString();
      return docNum.includes('/' + selectedYear);

      // *หมายเหตุ: หากในอนาคตคุณสร้างคอลัมน์ชื่อ "ปีงบประมาณ" แยกออกมาในชีท
      // สามารถเปลี่ยนไปใช้คำสั่ง: return item['ปีงบประมาณ'] == selectedYear; ได้เลย
    });
  }

  renderTable(filteredData);
}

function resetCounters() {
  const ids = ['val-received', 'val-inprogress', 'val-completed', 'val-canceled', 'val-total'];
  ids.forEach(id => {
    if (document.getElementById(id)) document.getElementById(id).innerText = '0';
  });
}

function renderTable(dataArray) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  if (!dataArray || dataArray.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500">ไม่มีรายการในหมวดหมู่นี้</td></tr>`;
    resetCounters();
    return;
  }

  let receivedCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let canceledCount = 0;

  dataArray.forEach(item => {
    const statusText = (item['สถานะ'] || '').toString().trim();

    if (statusText === 'รับเรื่อง') receivedCount++;
    else if (statusText === 'กำลังดำเนินการ') inProgressCount++;
    else if (statusText === 'เสร็จสิ้น') completedCount++;
    else if (statusText === 'ยกเลิก') canceledCount++;

    let statusBadge = '';

    if (statusText === 'รับเรื่อง') {
      statusBadge = `<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">${statusText}</span>`;
    } else if (statusText === 'กำลังดำเนินการ') {
      statusBadge = `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">${statusText}</span>`;
    } else if (statusText === 'เสร็จสิ้น') {
      statusBadge = `<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">${statusText}</span>`;
    } else if (statusText === 'ยกเลิก') {
      statusBadge = `<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">${statusText}</span>`;
    } else {
      statusBadge = `<span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">${statusText || '-'}</span>`;
    }

    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-gray-50';
    tr.innerHTML = `
      <td class="px-4 py-3 text-gray-600">${item['เลขที่'] || '-'}</td>
      <td class="px-4 py-3 font-medium text-blue-700">${item['เรื่อง'] || '-'}</td>
      <td class="px-4 py-3 text-gray-500 text-xs">${item['กองงาน'] || '-'}</td>
      <td class="px-4 py-3">${statusBadge}</td>
      <td class="px-4 py-3 text-gray-500">${item['วันที่'] || '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('val-received').innerText = receivedCount;
  document.getElementById('val-inprogress').innerText = inProgressCount;
  document.getElementById('val-completed').innerText = completedCount;
  document.getElementById('val-canceled').innerText = canceledCount;
  document.getElementById('val-total').innerText = dataArray.length;
}

// โหลดหน้า all เมื่อเปิดเว็บ (แก้ไขเป็นเรียกฟังก์ชันใหม่)
document.addEventListener('DOMContentLoaded', () => {
  fetchDashboardData();
});

// ---------- ส่วนราชการ: เปิดหัวข้อที่ตรงกับ URL hash อัตโนมัติ ----------
(function initDeptHashOpen() {
  if (!location.hash) return;
  const target = document.querySelector('details' + location.hash);
  if (!target) return;
  target.setAttribute('open', '');
  setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
})();

document.querySelectorAll('details.dept-card').forEach((d) => {
  d.addEventListener('toggle', () => {
    const icon = d.querySelector('.dept-chevron');
    if (icon) icon.classList.toggle('rotate-180', d.open);
  });
});

// ---------- ฟอร์มติดต่อเรา ----------
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    Swal.fire({
      icon: 'success',
      title: 'ส่งข้อความสำเร็จ!',
      text: 'ขอบคุณที่ติดต่อเทศบาลเมืองอ่างศิลา เจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุด',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#1e3a8a'
    }).then(() => contactForm.reset());
  });
}

// ---------- ข่าวสาร: ตัวกรองหมวดหมู่ + ป๊อปอัป ----------
const newsGrid = document.getElementById('newsGrid');
if (newsGrid) {
  const filterBtns = document.querySelectorAll('.news-filter-btn');
  const newsCards = document.querySelectorAll('.news-card');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      filterBtns.forEach((b) => {
        b.classList.remove('bg-blue-900', 'text-white');
        b.classList.add('bg-white', 'text-gray-600', 'border', 'border-gray-300');
      });
      btn.classList.add('bg-blue-900', 'text-white');
      btn.classList.remove('bg-white', 'text-gray-600', 'border', 'border-gray-300');

      newsCards.forEach((card) => {
        card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
      });
    });
  });
}

function showNewsDetail(id) {
  if (typeof NEWS_DATA === 'undefined') return;
  const item = NEWS_DATA.find((n) => n.id === id);
  if (!item) return;
  Swal.fire({
    title: item.title,
    html: `<p class="text-left text-sm text-gray-500 mb-3">${item.date} • ${item.category}</p>
           <p class="text-left leading-relaxed">${item.body}</p>`,
    confirmButtonText: 'ปิด',
    confirmButtonColor: '#1e3a8a',
    width: 600
  });
}