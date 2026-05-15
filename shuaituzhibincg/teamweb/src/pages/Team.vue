<script setup>
import { NButton, NDivider, NCard, NForm, NFormItem, NInput, NSpin, NSelect, NSwitch, NFormItemGi } from 'naive-ui';
import { getPlayerTeam } from '../api';
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { herocfg as hcfg, skillcfg as scfg } from '../cfg';
import { useRouter } from 'vue-router'
import * as XLSX from 'xlsx';

const router = useRouter()

const herocfg = JSON.parse(hcfg);
const skillcfg = JSON.parse(scfg);

const report = ref([]);
const nextid = ref(0);
const atkname = ref('');
const atkunionname = ref('');
const idu = ref('');
const atkhp = ref('');
const atkstar = ref('');
const atklevel = ref('');
const loaddataing = ref(false);
const reportTotal = ref(0);
const serachType = ref(null);
const noviewnpc = ref(false);
const havemore = ref(true);
const serachTypeList = [
	{
		value: '1',
		label: '双方其一满足条件'
	},
	{
		value: '2',
		label: '只筛选进攻方'
	},
	{
		value: '3',
		label: '只筛选防守方'
	},
	{
		value: '4',
		label: '双方都需要满足条件(名字和同盟名字除外)'
	},
];

const buildskilltext = (data) =>{
	let skilltext = '';
	if(data?.skill1id > 0){
		skilltext += `${skillcfg[data.skill1id]?.name ? skillcfg[data.skill1id]?.name : '未知'} ${data.skill1level}级\n`;
	}else{
		skilltext += ` - \n`;
	}

	if(data?.skill2id > 0){
		skilltext += `${skillcfg[data.skill2id]?.name ? skillcfg[data.skill2id]?.name : '未知'} ${data.skill2level}级\n`;
	}else{
		skilltext += ` - \n`;
	}

	if(data?.skill3id > 0){
		skilltext += `${skillcfg[data.skill3id]?.name ? skillcfg[data.skill3id]?.name : '未知'} ${data.skill3level}级`;
	}else{
		skilltext += ` - `;
	}

	return skilltext;
}

const exportExcel = () => {
	let data = [];
	data.push([
		"名字",
		"阵容红度",
		"大营武将",
		"中军武将",
		"前锋武将",
		"大营技能",
		"中军技能",
		"前锋技能",
		"记录类型",
		"记录时间"
	]);
	report.value.forEach(e=>{
		let skill = [];
		if(e.role == "attack"){
			skill.push(buildskilltext(e.all_skill_info[0]));
			skill.push(buildskilltext(e.all_skill_info[1]));
			skill.push(buildskilltext(e.all_skill_info[2]));
		}else{
			skill.push(buildskilltext(e.all_skill_info[5]));
			skill.push(buildskilltext(e.all_skill_info[4]));
			skill.push(buildskilltext(e.all_skill_info[3]));
		}
		data.push([
			e.player_name,
			e.total_star,
			`${e.hero1_star}红
			${e.hero1_level}级
			${herocfg[e.hero1_id]?.uniqueName ? herocfg[e.hero1_id]?.uniqueName : e.hero1_id}`,
			`${e.hero2_star}红
			${e.hero2_level}级
			${herocfg[e.hero2_id]?.uniqueName ? herocfg[e.hero2_id]?.uniqueName : e.hero2_id}`,
			`${e.hero3_star}红
			${e.hero3_level}级
			${herocfg[e.hero3_id]?.uniqueName ? herocfg[e.hero3_id]?.uniqueName : e.hero3_id}`,
			skill[0],
			skill[1],
			skill[2],
			e.role == "attack" ? "进攻时记录" : '防守时记录',
			formatTimestamp(e.time)
		]);
	});
	const ws = XLSX.utils.aoa_to_sheet(data);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
	XLSX.writeFile(wb, 'table.xlsx');
};

const resetReport = () => {
	atkname.value = '';
	atkstar.value = '';
	atklevel.value = '';
	serachType.value = null;
	noviewnpc.value = false;
	atkunionname.value = '';
	idu.value = '';
	atkhp.value = '';
	getReportListData(1);
}

const getrightheroskillindex = (index) => {
	if(index == 0){
		return 5;
	}else if(index == 1){
		return 4;
	}else{
		return 3
	}
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

function splitwid(num) {
    const numStr = num.toString();
    const lastFour = numStr.slice(-4);
    const firstPart = numStr.slice(0, -4);
    const lastFourNumber = parseInt(lastFour, 10);
    return `${firstPart},${lastFourNumber}`
}

const getReportListData = (clear=false) => {
	if(clear){
		nextid.value = 0;
		report.value = [];
		havemore.value = true;
	}
	if(loaddataing.value == true)return;
	loaddataing.value = true;
	getPlayerTeam({
		nextid:nextid.value,
		atkname:atkname.value,
		atkunionname:atkunionname.value,
		idu:idu.value,
		atkhp:atkhp.value,
		atkstar:atkstar.value,
		atklevel:atklevel.value,
		nonpc:noviewnpc.value ? 1 : 0,
		type:serachType.value == null ? 1 : serachType.value
	}).then((v) => {
		if(v.status == 200){
			let resp = v.data
			let data = resp.data;
			if(resp.data.length > 0){
				data.forEach(e => {
					let all_skill_info_arr = e.all_skill_info.split(';').filter(item => item !== '');
					let all_skill_info = [];
					all_skill_info_arr.forEach(e => {
						e = e.split(',')
						let obj = {
							index:e[0],
							skill1id:e[1],
							skill1level:e[2],
							skill2id:e[3],
							skill2level:e[4],
							skill3id:e[5],
							skill3level:e[6],
						}
						all_skill_info.push(obj)
					});
					e.all_skill_info = all_skill_info;
					report.value.push(e)
				});
			}else{
				havemore.value = false;
			}
			loaddataing.value = false;
		}
	}).catch(e => {
		loaddataing.value = false;
	});
}

const handleScroll = () => {
	const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
	const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
	const clientHeight = document.documentElement.clientHeight || document.body.clientHeight;

	if (scrollTop + clientHeight >= scrollHeight - 30) {
	}
};

onMounted( _ => {
	getReportListData();
	window.addEventListener('scroll', handleScroll);
})

onBeforeUnmount(() => {
	window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
	<div class="team-page">
		<div class="page-header">
			<div class="header-info">
				<h1 class="page-title">队伍查询</h1>
				<p class="page-subtitle">查询玩家队伍配置与战报数据</p>
			</div>
			<n-button text @click="router.push('/')">
				返回战报页
			</n-button>
		</div>

		<div class="filter-card">
			<div class="filter-row">
				<n-select v-model:value="serachType" :options="serachTypeList" placeholder="筛选模式 (默认双方其一满足)" style="width: 300px;" />
			</div>
			<n-form inline :label-width="80" style="margin-top: 12px;">
				<n-form-item label="名字">
					<n-input placeholder="" v-model:value="atkname" />
				</n-form-item>
				<n-form-item label="同盟名字">
					<n-input placeholder="" v-model:value="atkunionname" />
				</n-form-item>
				<n-form-item label="队伍标识">
					<n-input placeholder="" v-model:value="idu" />
				</n-form-item>
				<n-form-item>
					<n-button type="primary" @click="getReportListData(1)">查询</n-button>
				</n-form-item>
				<n-form-item>
					<n-button @click="resetReport(1)">重置</n-button>
				</n-form-item>
			</n-form>
			<n-form inline :label-width="80" style="margin-top: 8px;">
				<n-form-item>
					<n-button @click="exportExcel">将结果导出为表格</n-button>
				</n-form-item>
			</n-form>
		</div>

		<div class="report-list">
			<div class="report-item" v-for="item in report" :key="item.battle_id">
				<div class="report-id">战报ID：{{ item.battle_id }}</div>
				<div class="report-header">
					<div class="side left">
						<div class="side-info">
							<div class="role-tag" :class="item.role == 'attack' ? 'role-attack' : 'role-defend'">
								{{ item.role == 'attack' ? '进攻' : '防守' }}
							</div>
							<div class="player-name">{{ item.player_name }}</div>
							<div class="time-text">{{ formatTimestamp(item.time) }}</div>
						</div>
						<div class="team-id">
							队伍标识：{{ item.idu ? item.idu : "缺失队伍标识" }}
						</div>
					</div>
					<div class="side center">
						<img src="/src/assets/img/3d_report_txt_s_01.png" v-if="item.result == 2 || item.result == 1" class="result-img">
						<img src="/src/assets/img/3d_report_txt_s_02.png" v-if="item.result == 6" class="result-img">
						<img src="/src/assets/img/3d_report_txt_s_03.png" v-if="item.result == 0" class="result-img">
					</div>
					<div class="side right">
					</div>
				</div>
				<div class="report-content">
					<div class="hero-side hero-left">
						<div v-for="(hero, heroindex) in 3" :key="heroindex" class="hero-slot">
							<div class="hero-name">{{ herocfg[item[`hero${hero}_id`]]?.name ? herocfg[item[`hero${hero}_id`]]?.name : item[`hero${hero}_id`] > 130000 ? herocfg[item[`hero${hero}_id`]-30000]?.name : item[`hero${hero}_id`] }}</div>
							<div class="report-hero" v-if="hero.id != 0">
								<div class="hero" style="height: 140px;">
									<img :src="`https://g0.gph.netease.com/ngsocial/community/stzb/cn/cards/cut/card_medium_${herocfg[item[`hero${hero}_id`]]?.iconId ? herocfg[item[`hero${hero}_id`]]?.iconId : item[`hero${hero}_id`] > 130000 ? item[`hero${hero}_id`] - 30000 : item[`hero${hero}_id`] }.jpg?gameid=g10`">
									<div class="bottom">
										<div>LV.{{ item[`hero${hero}_level`] }}</div>
										<div style="width: 48px;height: 48px;position: absolute; top: -6px; right: -6px;">
											<img :src="`https://cbg-stzb.res.netease.com/mvvm/rc346663d4140700aaab6da137/images/bz/${item.role != 'attack' ? item['hero_type'].split(',')[`${3-hero}`] : item['hero_type'].split(',')[`${hero}`]}.png`" style="width: 70%;">
										</div>
									</div>
									<div class="stars">
										<div class="star" :class="{'up': item[`hero${hero}_star`] >= (i+1)}" v-for="(s,i) in herocfg[item[`hero${hero}_id`]]?.quality ? herocfg[item[`hero${hero}_id`]]?.quality : item[`hero${hero}_id`] > 13000 ? herocfg[item[`hero${hero}_id`]-30000]?.quality : 0" :key="i"></div>
									</div>
								</div>
							</div>
							<div class="skills" v-if="hero.id != 0 && item.all_skill_info.length > 0 && item.role == 'attack'">
								<div class="skill" v-if="item.all_skill_info[heroindex]?.skill1id != 0">
									{{ skillcfg[item.all_skill_info[heroindex]?.skill1id]?.name ? skillcfg[item.all_skill_info[heroindex]?.skill1id]?.name : '未知' }}
									[{{ item.all_skill_info[heroindex]?.skill1level}}级]
								</div>
								<div class="skill" v-if="item.all_skill_info[heroindex]?.skill2id != 0">
									{{ skillcfg[item.all_skill_info[heroindex]?.skill2id]?.name ? skillcfg[item.all_skill_info[heroindex]?.skill2id]?.name : '未知' }}
									[{{ item.all_skill_info[heroindex]?.skill2level}}级]
								</div>
								<div class="skill" v-if="item.all_skill_info[heroindex]?.skill3id != 0">
									{{ skillcfg[item.all_skill_info[heroindex]?.skill3id]?.name ? skillcfg[item.all_skill_info[heroindex]?.skill3id]?.name : '未知' }}
									[{{ item.all_skill_info[heroindex]?.skill3level}}级]
								</div>
							</div>
							<div class="skills" v-if="hero.id != 0 && item.all_skill_info.length > 0 && item.role != 'attack'">
								<div class="skill" v-if="item.all_skill_info[getrightheroskillindex(heroindex)]?.skill1id != 0">
									{{ skillcfg[item.all_skill_info[getrightheroskillindex(heroindex)]?.skill1id]?.name ? skillcfg[item.all_skill_info[getrightheroskillindex(heroindex)]?.skill1id]?.name : '未知' }}
									[{{ item.all_skill_info[getrightheroskillindex(heroindex)]?.skill1level}}级]
								</div>
								<div class="skill" v-if="item.all_skill_info[getrightheroskillindex(heroindex)]?.skill2id != 0">
									{{ skillcfg[item.all_skill_info[getrightheroskillindex(heroindex)]?.skill2id]?.name ? skillcfg[item.all_skill_info[getrightheroskillindex(heroindex)]?.skill2id]?.name : '未知' }}
									[{{ item.all_skill_info[getrightheroskillindex(heroindex)]?.skill2level}}级]
								</div>
								<div class="skill" v-if="item.all_skill_info[getrightheroskillindex(heroindex)]?.skill3id != 0">
									{{ skillcfg[item.all_skill_info[getrightheroskillindex(heroindex)]?.skill3id]?.name ? skillcfg[item.all_skill_info[getrightheroskillindex(heroindex)]?.skill3id]?.name : '未知' }}
									[{{ item.all_skill_info[getrightheroskillindex(heroindex)]?.skill3level}}级]
								</div>
							</div>
						</div>
					</div>
					<div class="report-result">
					</div>
					<div class="hero-side hero-right">
					</div>
				</div>
			</div>
		</div>

		<div class="loading-more">
			<n-spin size="large" v-show="loaddataing && havemore" />
			<div class="no-more" v-show="havemore == false">没有更多数据了</div>
		</div>
	</div>
</template>

<style scoped>
.team-page {
	width: 100%;
}

.page-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
	padding-bottom: 16px;
	border-bottom: 1px solid var(--color-border);
}

.page-title {
	font-size: 22px;
	font-weight: 700;
	color: var(--color-heading);
	margin: 0;
}

.page-subtitle {
	font-size: 14px;
	color: var(--color-text-tertiary);
	margin: 4px 0 0;
}

.filter-card {
	background: var(--color-surface);
	border-radius: var(--radius-lg);
	padding: 20px;
	margin-bottom: 20px;
	border: 1px solid var(--color-border);
	box-shadow: var(--shadow-sm);
}

.filter-row {
	margin-bottom: 4px;
}

.report-list {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.report-item {
	width: 100%;
	display: flex;
	background: var(--color-surface);
	border-radius: var(--radius-lg);
	border: 1px solid var(--color-border);
	box-shadow: var(--shadow-sm);
	flex-direction: column;
	margin: 8px 0;
	align-items: center;
	overflow: hidden;
	transition: box-shadow 0.2s ease;
}

.report-item:hover {
	box-shadow: var(--shadow-md);
}

.report-id {
	align-self: flex-start;
	margin: 12px 16px 0;
	font-size: 12px;
	color: var(--color-text-tertiary);
}

.report-header {
	display: flex;
	width: 100%;
	padding: 12px 16px;
}

.report-header .side.left {
	width: 42.5%;
	flex-shrink: 0;
	display: flex;
	justify-content: flex-end;
	flex-direction: column;
	align-items: flex-end;
}

.report-header .side.center {
	width: 15%;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.report-header .side.right {
	width: 42.5%;
	flex-shrink: 0;
}

.side-info {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.role-tag {
	font-size: 12px;
	padding: 2px 10px;
	border-radius: var(--radius-sm);
	font-weight: 500;
}

.role-attack {
	background: var(--color-primary-lighter);
	color: var(--color-primary);
}

.role-defend {
	background: #fef3c7;
	color: #b45309;
}

.player-name {
	font-size: 15px;
	font-weight: 600;
	color: var(--color-heading);
}

.time-text {
	font-size: 12px;
	color: var(--color-text-tertiary);
}

.team-id {
	font-size: 12px;
	color: var(--color-text-secondary);
	margin-top: 4px;
	margin-right: 8px;
}

.result-img {
	width: 120px;
	height: 120px;
	object-fit: cover;
}

.report-content {
	width: 100%;
	display: flex;
}

.hero-side {
	position: relative;
	display: flex;
	width: 42.5%;
	flex-shrink: 0;
	justify-content: flex-end;
	align-items: flex-start;
}

.hero-side.hero-right {
	flex-direction: row-reverse;
}

.report-result {
	width: 15%;
	flex-shrink: 0;
}

.hero-slot {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin: 0 4px;
}

.hero-name {
	font-size: 13px;
	font-weight: 500;
	color: var(--color-heading);
	margin-bottom: 4px;
	text-align: center;
}

.report-hero {
	position: relative;
	margin: 0 4px;
}

.report-hero .hero {
	position: relative;
	border-radius: var(--radius-sm);
	overflow: hidden;
}

.report-hero .hero img {
	width: 140px;
	height: 140px;
	object-fit: cover;
	object-position: left top;
}

.report-hero .hero .bottom {
	width: 100%;
	display: flex;
	position: absolute;
	bottom: 0;
	left: 0;
	justify-content: space-between;
	padding: 0 2px;
	box-sizing: border-box;
	background-color: rgba(0, 0, 0, 0.55);
	color: #fff;
	font-size: 12px;
}

.stars {
	display: flex;
	position: absolute;
	top: 4px;
	right: 8px;
	gap: 2px;
}

.stars .star {
	width: 18px;
	height: 18px;
	background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAMAUExURQAAABoMBhoMBhoMBhoMBhkLBRoMBhoMBhoMBhoMBhoMBhUIAxoMBhoLBRkLBRcKBBYJBBQHAxkLBRUHBBoMBhoMBhoMBhcKBBgKBRkIBBoMBhoMBhgLBRkLBRMFAhoMBhkMBRMFAhQIBBAEARoMBhkMBhIEAhYGBCYUChYJBBkLBRgLBRgLBS0SCiEKBhoMBioWCyIRChoMBhoMBhcIA00lE2MxGCITChgLBTwlFFkqFXBcSI5KIzcZDUo3KHI7HScPCBgGBF9LOTkoGUUiET0jEz0bDrVrMkcyGoNDILFoL5+Qdm0+Gy0bD4d3ZpFbJnBVLL2pWXtfMHY9HE8yGFotFRMGBGFGI5VPJlo9IJl7PpF/aKleK1Y9JLuXSINjQZ1XKcy+p9bKq6STgr+wm6NoMXdmT4pRJn9LJMCyi825YDooF15MOj8eD4BtTrGiZU49LLCVUbGhfYVlMa+fjKqEP5tjLP/SYf/vbf//d//gZ//8c//pavrGW//zb///dP/jaP/NXv/tbP/5cf/ZZP/QYPfDWuy6V9ynTv/dZf//dv//fv//e//2cfXDXP//lv//+P//8//1bv/mafvJXv//hfW+WOeyU7hiLf/5Yv/ybP//6/7KXf//bfC8V+y1VK9fLP//1+GsUP///v/XYv//gv/xbf33hPvzg9CNQ/nQZPC3Vf//48ZtMcFqMP//s//+pd+FPP/8ZOuURP/+29+LQP//jv//ifK/WKNWKP/3e9Z8OezDW75xNNWHPr5kLcl3N6pZKeKwUf/8g9mBO+/pzP/5bOaiStqRQPTJZefCU+KZOvzMXf3YbtqLP/HPZNnEYMhvM97Tu8OCPc2ZR8uFPu2YRMeMQv7SZ///x+W6W/bu2+bbweuPQf74sP//xuWPQv341eygRu/bmu/NgPrubt+VPv//w/z6jP/gcPjqhN18OP/sef//zOqrT/rue+vgyv755v35n+vedrd0NuO1VemKP9mdSrNZKdqvbP76eOWbNPnwnvjvY96wQf/aaC/iuB8AAAB3dFJOUwAMBzUKVBsCAQMWbBE6P2B/ek+DHyExaGWhDilZV4ASQ4ZvdiNJjpagc0t5XL61K6yQJS2L0eSXSLXgz/jCs+evqb+lxsDK/cDz/unimtnx2fzi7MzYk8721u/f+sT97Pn8/On29tDt6Pb7rcvH3PC+9e/k7/TxZRQ62gAABRJJREFUSMfFVmVUHFcY7coMO7M2K7ACaxBcswsBQoh7iDbSuCd1b3dhfWGFwBoOiweCBCfu7u4ujdTd9fQtOW3TMKfZ/mnvOfPeOXPune+97/veffPMM/8TKEQCkfIv+EQ0MEAu9F3hBzOYPJGC7LOAQOINTMDYMOJzADY2fnEylS70UUAGASadG8OB/H0LgXAh8dCDbfMighk0nwRCOjV5kvv21zNlQXJfQiD+Is7rB923Nr8RESmV+JBaGiM44k133VdNH81NZCqITw8gD5K9fNfTWdy8aXoCKwp+agiJNDLiBfenmxo/aGqaFsYn/VP1KAhCpJGYiWl1bV2ZxZua97+YikFyAhHpv3UK4JIlsH88SRrDemmZ+/3GzMbizc37Z4RTIQYpkIsKgYry14cJKCxX0KVREJMawhG8uqHNqc/LyytubjozPkwcwothpzBI8f4wjej3qLAD6CnsID6VJRs4edTQkfNveDrzM4Egr/Hzba+ljRw6KjlRHEJlQlGMQBrS1zlRkRgHcEemTVm+4tx119q6zVV5+V5sc9Z9+cXSt+evAqrJAznRQQpvd5Hj+RELV01ZvvTGdffatS63p85ZtSazD3rnVY/b5fJsOLhsxaQpaanRUbC3lwN4wxffq/O4XO62q51dzmJ9);
	background-size: 100% 100%;
	opacity: 0.4;
}

.stars .star.up {
	background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAMAUExURQAAABkLBRoMBhoMBhoMBhoMBhkLBRoMBhoMBhoMBhoMBhoMBhoMBhcLBRULBRoMBhoLBRMJBRMLBRoMBhgLBhQJBRYIBBoMBhcLBRgMBhoMBhMJBBYKBRkIBBkLBRMKBBUKBb8PAxYLBRoMBi0IAx4HAxIKBUUIBBQKBBgMBlsLA3gPBCILBiEIBDUNBs4UBA4LBpkTBIYJAykOCVIIA40QBBoMBmQPBG4RBCYDADYJAkcXB0wGAl8hDDoIBJ8NA7ENA94UBNMvDGIuHksOBEIYCKhRH9+fSkAJA7ddKtWAPqYxDKwRBE4HBOUWBYUUBUIqIHBEM6BrUc2kfVMlE+JJEmAKA3AvE4dFIHotDX8jDZMvDsc2DZBCG7svC8YiCLchCN4kCKkhCH4UBbJyS4ddStuue8yXY7xxOsZ1NpM3GdWRMMF2KdehWpU2FdZBEa02DZhKG2keDZtDHcxXF79GEf5dGfxMFP9xHv94IP+LJPxJE/97IPdFEvtUFv+IJP+EJP9iGv9XF/9sHf+AIv+XKP+pLf91H/s7EP9qHPMvDP+hLP+2Mv5UFvY3Dv5IE/9mG/c7D//YPfY/EPlPFe8YBfcrC/+TJv+cKv/NOv7sff1XF/9RFfpDEf9OFPI1DfYdB/UxDOsWBf5AEf9+IfdiGf/6dv+zLf/SOv/FOP+sKP/KZP+9NP/4Tf+8ZvEfB+0jCfQmCewcB+xAEf6QJv+kLf//vP+xMv+qOP//pvdzH/7tWPKDP/6hJf/ab/BoG+8sC/AmCvI8D/MhCeUyDPRSFv+vLf7zav+mQP/3gv/+XP/+Z/+sWfR8H/JcFv/BRP/CMN8wDPMVBerCb//+kPxiG+5ZFvnnkPNxG//0Xv/fdP/gQP/Njf/sR/+xYv/RSPhzKP+mS/6fUv+zTv//l/+4UvqIL//AOf8dBvrqsfntqv7saPWDKO/BUf7ybPK5Wuy6O//jaf+TMv/NdOOMSv+RO/+STf6ePP/wkOuqUvBaGfKrT/iUO+akSv/lTu1fGS7CN6cAAAB2dFJOUwBDDBIPGTgDAQUVKAhTYyE1a18dWXyCAk9LLG1/djxnVulcJIyEep5wRrTFg4mZ8XLWyZCp0zC9xJKeqbu1ldni+Pi1rqTg/a7q+e3fpfzNm7rZ763+wcDNxsrX99vz7uf63s7mxPny7PLa+u332vryy8Da8Op7pU6XAAAFLUlEQVRIx8VWVVRbWRRt3F2IGwR3aCkF6u7u7UjHXeNKhJAEAkmQQCF4cddCoQZ1m6m7d9xd1poXumamq2RNMz8z7+N+7X33O3efs++dNOl/+hBgKBjxL/AoNIvIggTOQMBAeJJoCjhgAhROWrkqWhCMClSAgIt+fs3KcBAaGbBA0pqPV8eQMagABQTiVZ/0vrCWGwELCkiAx459sXfgwuokPhEbiECwQLzxQu/Zsx/O4TAoT5ZAQkDh817vHThSV/JcEh/+5KPFssgxG0sGjhz6tA6QwBGe5B4SxgxNW3C3bnDwUN0XL8WSeNB/AiNQWAgcn7qtZOBYy9G6Q5c+3yCmsqBY1MRCkMggAAsLZhFBZNrcBXePtLQcPXbs0tHXprEFICKGgIZiEYi/XUSB0ZRgFhzEFJBJXPq0+SU/DTrrr7W0XBv8alMqncsX4ZggOCsYBsU+lMIS4BEMKp7NFadOS8t4592fS4adp5sbPE6n58qr2zasnRcbEs0lkQUMHgbqOwIEhcGNjkmKTcvY/Mqixd8N3W5tunHa3tBgb3B6bnzd9OWCl+dv2ZQxzgIKAgjgKfy0qZvfWLR4aOj61avfHv/h1qnTY+YGZ73zSv2ppuHLl5uO3/7198WL5r89J5RJedhqC5fc/P);
	opacity: 1;
}

.skills {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 6px;
	justify-content: center;
}

.skill {
	font-size: 12px;
	color: var(--color-primary);
	background: var(--color-primary-lighter);
	padding: 2px 6px;
	border-radius: 4px;
	white-space: nowrap;
}

.loading-more {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 24px 0;
}

.no-more {
	font-size: 14px;
	color: var(--color-text-tertiary);
}
</style>
