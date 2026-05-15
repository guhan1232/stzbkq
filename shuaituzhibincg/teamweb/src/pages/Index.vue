<script setup>
import { NButton, NDivider, NConfigProvider, NGlobalStyle, NCard, NForm, NFormItem, NInput, NSpin, NSelect, NSwitch } from 'naive-ui';
import { reportList } from '../api';
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { herocfg as hcfg, skillcfg as scfg } from '../cfg';
import { useRouter } from 'vue-router'

const router = useRouter()

const herocfg = JSON.parse(hcfg);
const skillcfg = JSON.parse(scfg);

const report = ref([]);
const nextid = ref(0);
const atkname = ref('');
const atkunionname = ref('');
const atkhp = ref('');
const atkstar = ref('');
const atklevel = ref('');
const loaddataing = ref(false);
const reportTotal = ref(0);
const serachType = ref(null);
const noviewnpc = ref(false);
const havemore = ref(true);
const serachTypeList = [
	{ value: '1', label: '双方其一满足条件' },
	{ value: '2', label: '只筛选进攻方' },
	{ value: '3', label: '只筛选防守方' },
	{ value: '4', label: '双方都需要满足条件(名字和同盟名字除外)' },
];

const resetReport = () => {
	atkname.value = '';
	atkstar.value = '';
	atklevel.value = '';
	serachType.value = null;
	noviewnpc.value = false;
	atkunionname.value = '';
	atkhp.value = '';
	getReportListData(1);
}

const getrightheroskillindex = (index) => {
	if (index == 0) return 5;
	else if (index == 1) return 4;
	else return 3;
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
	return `${firstPart},${lastFourNumber}`;
}

const getReportListData = (clear = false) => {
	if (clear) {
		nextid.value = 0;
		report.value = [];
		havemore.value = true;
	}
	if (loaddataing.value == true) return;
	loaddataing.value = true;
	reportList({
		nextid: nextid.value,
		atkname: atkname.value,
		atkunionname: atkunionname.value,
		atkhp: atkhp.value,
		atkstar: atkstar.value,
		atklevel: atklevel.value,
		nonpc: noviewnpc.value ? 1 : 0,
		type: serachType.value == null ? 1 : serachType.value
	}).then((v) => {
		if (v.status == 200) {
			let resp = v.data
			let data = resp.data.report;
			reportTotal.value = resp.data.total;
			if (resp.data.report.length > 0) {
				nextid.value = resp.data.report[resp.data.report.length - 1].id
				data.forEach(e => {
					let all_skill_info_arr = e.all_skill_info.split(';').filter(item => item !== '');
					let all_skill_info = [];
					all_skill_info_arr.forEach(e => {
						e = e.split(',')
						let obj = {
							index: e[0],
							skill1id: e[1],
							skill1level: e[2],
							skill2id: e[3],
							skill2level: e[4],
							skill3id: e[5],
							skill3level: e[6],
						}
						all_skill_info.push(obj)
					});
					let attack_all_hero_info = [];
					let attack_all_hero_info_arr = e.attack_all_hero_info.split(';').filter(item => item !== '');
					let attack_advance = e.attack_advance.split(';').filter(item => item !== '');
					let attacker_gear_info = e.attacker_gear_info.split(';').filter(item => item !== '');
					let attack_curhp = 0;
					let attack_hurthp = 0;
					attack_all_hero_info_arr.forEach((atk, index) => {
						let atk_arr = atk.split(",")
						if (atk_arr[0].slice(0, 2) === "13") atk_arr[0] = "10" + atk_arr[0].slice(2)
						attack_all_hero_info.push({
							id: atk_arr[0],
							level: atk_arr[1],
							army: atk_arr[2],
							curArmy: atk_arr[3],
							hurtArmy: atk_arr[4],
							advance: attack_advance[index + 1].split(','),
							attacker_gear_info: attacker_gear_info[index + 1].split(','),
						});
						attack_curhp += parseInt(atk_arr[3]);
						attack_hurthp += parseInt(atk_arr[3]) + parseInt(atk_arr[4]);
					});
					let defend_all_hero_info = [];
					let defend_all_hero_info_arr = e.defend_all_hero_info.split(';').filter(item => item !== '');
					let defend_advance = e.defend_advance.split(';').filter(item => item !== '');
					let defend_curhp = 0;
					let defend_hurthp = 0;
					defend_all_hero_info_arr.forEach((atk, index) => {
						let atk_arr = atk.split(",")
						if (atk_arr[0].slice(0, 2) === "13") atk_arr[0] = "10" + atk_arr[0].slice(2)
						let advindex = 0;
						if (index == 0) advindex = 2;
						else if (index == 1) advindex = 1;
						defend_all_hero_info.push({
							id: atk_arr[0],
							level: atk_arr[1],
							army: atk_arr[2],
							curArmy: atk_arr[3],
							hurtArmy: atk_arr[4],
							advance: defend_advance[advindex].split(',')
						})
						defend_curhp += parseInt(atk_arr[3]);
						defend_hurthp += parseInt(atk_arr[3]) + parseInt(atk_arr[4]);
					});
					e.attack_all_hero_info = attack_all_hero_info;
					e.defend_all_hero_info = defend_all_hero_info;
					e.defend_curhp = defend_curhp;
					e.defend_hurthp = defend_hurthp;
					e.attack_curhp = attack_curhp;
					e.attack_hurthp = attack_hurthp;
					e.attack_hp = e.attack_hp;
					e.defend_hp = e.defend_hp;
					e.all_skill_info = all_skill_info;
					report.value.push(e)
				});
			} else {
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
		if (havemore.value == true) getReportListData();
	}
};

onMounted(_ => {
	getReportListData();
	window.addEventListener('scroll', handleScroll);
})

onBeforeUnmount(() => {
	window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
	<div class="report-page">
		<div class="page-header">
			<div class="header-info">
				<h1 class="page-title">率土之滨战报数据站</h1>
				<p class="page-subtitle">知彼知己，百战不殆</p>
			</div>
			<div class="report-count">
				已收集战报数量: <strong>{{ reportTotal }}</strong>
			</div>
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
				<n-form-item label="红度">
					<n-input placeholder="" v-model:value="atkstar" />
				</n-form-item>
				<n-form-item label="兵力">
					<n-input placeholder="" v-model:value="atkhp" />
				</n-form-item>
				<n-form-item label="等级">
					<n-input placeholder="" v-model:value="atklevel" />
				</n-form-item>
				<n-form-item>
					<n-button type="primary" @click="getReportListData(1)">筛选</n-button>
				</n-form-item>
				<n-form-item>
					<n-button @click="resetReport(1)">重置</n-button>
				</n-form-item>
			</n-form>
			<n-form inline :label-width="80" style="margin-top: 8px;">
				<n-form-item label="不查看与NPC的战报">
					<n-switch v-model:value="noviewnpc" />
				</n-form-item>
				<n-form-item>
					<n-button @click="router.push('/team')">前往查询队伍</n-button>
				</n-form-item>
			</n-form>
		</div>

		<div class="report-list">
			<div class="report-item" v-for="item in report" :key="item.battle_id">
				<div class="report-id">战报ID：{{ item.battle_id }}</div>
				<div class="report-header">
					<div class="side left">
						<div class="side-info">
							<div class="union-name">{{ item.attack_union_name ? "【盟】" + item.attack_union_name : "" }}</div>
							<div class="player-name">{{ item.attack_name == "" && item.npc ? "守军" : item.attack_name }}</div>
						</div>
						<div class="hp-bar-wrap" style="justify-content: flex-end;">
							<div class="hp-text">{{ item.attack_curhp }}/<span class="hp-total">{{ item.attack_hp }}</span></div>
							<div class="hp-bar">
								<div class="hp-bar-hurt left" :style="`width:${item.attack_hurthp / item.attack_hp * 100}%`"></div>
								<div class="hp-bar-cur left" :style="`width:${item.attack_curhp / item.attack_hp * 100}%`"></div>
							</div>
						</div>
					</div>
					<div class="side center">
						<div class="location">{{ item.wid_name == "" || item.wid_name == " " ? "未知" : item.wid_name }} ({{ splitwid(item.wid) }})</div>
					</div>
					<div class="side right">
						<div class="side-info">
							<div class="union-name">{{ item.defend_union_name ? item.defend_union_name + "【盟】" : "" }}</div>
							<div class="player-name">{{ item.defend_name == "" && item.npc ? "守军" : item.defend_name }}</div>
						</div>
						<div class="hp-bar-wrap">
							<div class="hp-bar">
								<div class="hp-bar-hurt" :style="`width:${item.defend_hurthp / item.defend_hp * 100}%`"></div>
								<div class="hp-bar-cur" :style="`width:${item.defend_curhp / item.defend_hp * 100}%`"></div>
							</div>
							<div class="hp-text">{{ item.defend_curhp }}/<span class="hp-total">{{ item.defend_hp }}</span></div>
						</div>
					</div>
				</div>
				<div class="report-content">
					<div class="hero-side hero-left">
						<div v-for="(hero, heroindex) in item.attack_all_hero_info" :key="heroindex">
							<div v-if="hero.id != 0" class="hero-name">{{ herocfg[hero.id]?.name ? herocfg[hero.id]?.name : hero.id }}</div>
							<div class="report-hero" v-if="hero.id != 0">
								<div class="hero" style="height: 140px;">
									<img :src="`https://g0.gph.netease.com/ngsocial/community/stzb/cn/cards/cut/card_medium_${herocfg[hero.id]?.iconId ? herocfg[hero.id]?.iconId : hero.id}.jpg?gameid=g10`">
									<div class="bottom">
										<div>LV.{{ hero.level }}</div>
										<div>{{ hero.army }}</div>
									</div>
									<div class="stars">
										<div class="star" :class="{ 'up': hero.advance[0] >= (i + 1) }" v-for="(s, i) in herocfg[hero.id]?.quality ? herocfg[hero.id]?.quality : 0" :key="i"></div>
									</div>
								</div>
							</div>
							<div class="skills" v-if="hero.id != 0 && item.all_skill_info.length > 0">
								<div class="skill" v-if="item.all_skill_info[heroindex]?.skill1id != 0">
									{{ skillcfg[item.all_skill_info[heroindex]?.skill1id]?.name ? skillcfg[item.all_skill_info[heroindex]?.skill1id]?.name : '未知' }}
									[{{ item.all_skill_info[heroindex]?.skill1level }}级]
								</div>
								<div class="skill" v-if="item.all_skill_info[heroindex]?.skill2id != 0">
									{{ skillcfg[item.all_skill_info[heroindex]?.skill2id]?.name ? skillcfg[item.all_skill_info[heroindex]?.skill2id]?.name : '未知' }}
									[{{ item.all_skill_info[heroindex]?.skill2level }}级]
								</div>
								<div class="skill" v-if="item.all_skill_info[heroindex]?.skill3id != 0">
									{{ skillcfg[item.all_skill_info[heroindex]?.skill3id]?.name ? skillcfg[item.all_skill_info[heroindex]?.skill3id]?.name : '未知' }}
									[{{ item.all_skill_info[heroindex]?.skill3level }}级]
								</div>
							</div>
						</div>
					</div>
					<div class="report-result">
						<img src="/src/assets/img/3d_report_txt_s_01.png" v-if="item.result == 2 || item.result == 1">
						<img src="/src/assets/img/3d_report_txt_s_02.png" v-if="item.result == 6">
						<img src="/src/assets/img/3d_report_txt_s_03.png" v-if="item.result == 0">
						<div class="result-time">{{ formatTimestamp(item.time) }}</div>
					</div>
					<div class="hero-side hero-right">
						<div v-for="(hero, heroindex) in item.defend_all_hero_info" :key="heroindex">
							<div v-if="hero.id != 0" class="hero-name">{{ herocfg[hero.id]?.name ? herocfg[hero.id]?.name : hero.id }}</div>
							<div class="report-hero" v-if="hero.id != 0">
								<div class="hero" style="height: 140px;">
									<img :src="`https://g0.gph.netease.com/ngsocial/community/stzb/cn/cards/cut/card_medium_${herocfg[hero.id]?.iconId ? herocfg[hero.id]?.iconId : hero.id}.jpg?gameid=g10`">
									<div class="bottom">
										<div>LV.{{ hero.level }}</div>
										<div>{{ hero.army }}</div>
									</div>
									<div class="stars">
										<div class="star" :class="{ 'up': hero.advance[0] >= (i + 1) }" v-for="(s, i) in herocfg[hero.id]?.quality ? herocfg[hero.id]?.quality : 0" :key="i"></div>
									</div>
								</div>
							</div>
							<div class="skills" v-if="hero.id != 0 && item.all_skill_info.length > 0">
								<div class="skill" v-if="item.all_skill_info[getrightheroskillindex(heroindex)]?.skill1id != 0">
									{{ skillcfg[item.all_skill_info[getrightheroskillindex(heroindex)]?.skill1id]?.name ? skillcfg[item.all_skill_info[getrightheroskillindex(heroindex)]?.skill1id]?.name : '未知' }}
									[{{ item.all_skill_info[getrightheroskillindex(heroindex)]?.skill1level }}级]
								</div>
								<div class="skill" v-if="item.all_skill_info[getrightheroskillindex(heroindex)]?.skill2id != 0">
									{{ skillcfg[item.all_skill_info[getrightheroskillindex(heroindex)]?.skill2id]?.name ? skillcfg[item.all_skill_info[getrightheroskillindex(heroindex)]?.skill2id]?.name : '未知' }}
									[{{ item.all_skill_info[getrightheroskillindex(heroindex)]?.skill2level }}级]
								</div>
								<div class="skill" v-if="item.all_skill_info[getrightheroskillindex(heroindex)]?.skill3id != 0">
									{{ skillcfg[item.all_skill_info[getrightheroskillindex(heroindex)]?.skill3id]?.name ? skillcfg[item.all_skill_info[getrightheroskillindex(heroindex)]?.skill3id]?.name : '未知' }}
									[{{ item.all_skill_info[getrightheroskillindex(heroindex)]?.skill3level }}级]
								</div>
							</div>
						</div>
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
.report-page {
	width: 100%;
}

.page-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
	padding-bottom: 16px;
	border-bottom: 1px solid #e2e8f0;
}

.page-title {
	font-size: 22px;
	font-weight: 700;
	color: #1e293b;
	margin: 0;
}

.page-subtitle {
	font-size: 14px;
	color: #94a3b8;
	margin: 4px 0 0;
}

.report-count {
	font-size: 14px;
	color: #64748b;
	background: #eef1fe;
	padding: 8px 16px;
	border-radius: 10px;
}

.report-count strong {
	color: #4f6ef7;
	font-size: 18px;
}

.filter-card {
	background: #fff;
	border-radius: 14px;
	padding: 20px;
	margin-bottom: 20px;
	border: 1px solid #e2e8f0;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
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
	background: #fff;
	border-radius: 14px;
	border: 1px solid #e2e8f0;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	box-sizing: border-box;
	flex-direction: column;
	margin: 8px 0;
	align-items: center;
	overflow: hidden;
}

.report-id {
	align-self: flex-start;
	margin: 12px 16px 0;
	font-size: 13px;
	color: #94a3b8;
}

.report-content {
	width: 100%;
	display: flex;
}

.report-hero {
	position: relative;
	margin: 0 8px;
}

.report-result {
	width: 15%;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.report-result>img {
	width: 150px;
	height: 150px;
	object-fit: cover;
}

.result-time {
	font-size: 12px;
	color: #94a3b8;
	margin-top: 4px;
}

.report-hero>.hero>img {
	width: 140px;
	height: 140px;
	object-fit: cover;
	object-position: left top;
	border-radius: 8px;
}

.hero-side {
	position: relative;
	display: flex;
	width: 42.5%;
	flex-shrink: 0;
	justify-content: flex-end;
	align-items: flex-start;
}

.hero-right {
	flex-direction: row-reverse;
}

.hero-name {
	font-size: 13px;
	font-weight: 600;
	color: #1e293b;
	text-align: center;
	margin-bottom: 4px;
}

.report-hero>.hero>.bottom {
	width: 100%;
	display: flex;
	position: absolute;
	bottom: 0;
	left: 0;
	justify-content: space-between;
	padding: 0 4px;
	box-sizing: border-box;
	background-color: rgba(0, 0, 0, 0.55);
	color: #fff;
	font-size: 12px;
	border-radius: 0 0 8px 8px;
}

.report-header {
	display: flex;
	width: 100%;
	padding: 12px 16px;
}

.report-header>.side.left,
.report-header>.side.right {
	width: 42.5%;
	flex-shrink: 0;
	display: flex;
	justify-content: flex-end;
	flex-direction: column;
	align-items: flex-end;
}

.report-header>.side.left>div,
.report-header>.side.left>.side-info>div {
	margin-right: 8px;
	margin-left: 16px;
}

.report-header>.side.right>.side-info {
	display: flex;
	flex-direction: row-reverse;
}

.report-header>.side.left>.side-info {
	display: flex;
}

.report-header>.side.right>div,
.report-header>.side.right>.side-info>div {
	margin-left: 8px;
	margin-right: 16px;
}

.report-header>.side.right {
	align-items: flex-start;
}

.report-header>.side.center {
	width: 15%;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.side-info {
	display: flex;
	align-items: center;
	gap: 4px;
}

.union-name {
	font-size: 13px;
	color: #64748b;
}

.player-name {
	font-size: 14px;
	font-weight: 600;
	color: #1e293b;
}

.location {
	font-size: 13px;
	color: #64748b;
}

.hp-bar-wrap {
	display: flex;
	position: relative;
	width: 100%;
	align-items: center;
}

.hp-text {
	font-size: 12px;
	color: #334155;
	margin: 0 8px;
	white-space: nowrap;
}

.hp-total {
	color: #94a3b8;
}

.hp-bar-wrap>.hp-bar {
	display: flex;
	width: 70%;
	position: relative;
	height: 8px;
	background-color: #e2e8f0;
	border-radius: 4px;
	overflow: hidden;
}

.hp-bar-hurt {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 8px;
	background-color: #fecaca;
	border-radius: 4px;
}

.hp-bar-cur {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 8px;
	background-color: #f87171;
	border-radius: 4px;
}

.hp-bar-hurt.left,
.hp-bar-cur.left {
	right: 0;
	left: unset;
}

.hp-bar-cur.left {
	background-color: #4f6ef7;
}

.hp-bar-hurt.left {
	background-color: #bfdbfe;
}

.stars {
	display: flex;
	position: absolute;
	top: 4px;
	right: 8px;
}

.stars>.star {
	width: 16px;
	height: 16px;
	background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23cbd5e1" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>') no-repeat center/contain;
}

.stars>.star.up {
	background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23fbbf24" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>') no-repeat center/contain;
}

.skills {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin: 4px 0;
}

.skill {
	font-size: 12px;
	color: #4f6ef7;
	background: #eef1fe;
	padding: 2px 6px;
	border-radius: 4px;
	white-space: nowrap;
}

.loading-more {
	text-align: center;
	padding: 24px;
	color: #94a3b8;
}

.no-more {
	font-size: 14px;
	color: #94a3b8;
}
</style>
