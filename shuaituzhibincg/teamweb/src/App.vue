<script setup>
import {NMessageProvider} from 'naive-ui'
</script>

<template>
	<n-message-provider>
		<router-view v-slot="{ Component, route }">
			<keep-alive include="Index">
				<component :is="Component" :key="route.path"></component>
			</keep-alive>
		</router-view>
	</n-message-provider>
</template>

<style scoped></style>
