<script setup lang="ts">
	import { computed } from "vue"
	import { useRoute, RouterLink } from "vue-router"
	import { useAuthStore } from "@/stores/auth.store"

	const route = useRoute()
	const auth = useAuthStore()

	interface NavItem {
		label: string
		to: string
		name: string
		roles?: string[]
	}

	const navItems: NavItem[] = [
		{ label: "Dashboard", to: "/dashboard", name: "dashboard" },
		{ label: "Users", to: "/users", name: "users", roles: ["ADMIN", "MANAGER"] },
	]

	const visibleItems = computed(() =>
		navItems.filter(item => {
			if (!item.roles || !auth.user) {
				return !item.roles
			}

			return item.roles.includes(auth.user.role)
		}),
	)

	function isActive(item: NavItem) {
		if (item.name === "users") {
			return route.path.startsWith("/users")
		}

		return route.name === item.name || route.path.startsWith(`/${item.name}`)
	}
</script>

<template>
	<aside class="flex w-64 flex-col border-r border-slate-200 bg-white">
		<div class="border-b border-slate-200 px-6 py-5">
			<p class="text-xs font-semibold uppercase tracking-wider text-slate-500"
				>Hooshpod</p
			>
			<h1 class="text-lg font-semibold text-brand-800">Legal System</h1>
		</div>

		<nav class="flex-1 space-y-1 p-4">
			<RouterLink
				v-for="item in visibleItems"
				:key="item.name"
				:to="item.to"
				class="block rounded-md px-3 py-2 text-sm font-medium transition-colors"
				:class="
					isActive(item) ?
						'bg-brand-50 text-brand-800'
					:	'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
				"
			>
				{{ item.label }}
			</RouterLink>
		</nav>
	</aside>
</template>
