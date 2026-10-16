import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import KosakataPage from '../pages/KosakataPage.vue'
import PetaPage from '../pages/PetaPage.vue'
import NotePage from '../pages/NotePage.vue'
import ChatPage from '../pages/ChatPage.vue'
import ResourcePage from '../pages/ResourcePage.vue'
import SitusGroupPage from '../pages/SitusGroupPage.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomePage },
  { path: '/kosakata', name: 'kosakata', component: KosakataPage },
  { path: '/peta', name: 'peta', component: PetaPage },
  { path: '/catatan', name: 'catatan', component: NotePage },
  { path: '/chat', name: 'chat', component: ChatPage },
  { path: '/resource', name: 'resource', component: ResourcePage },
  { path: '/situsgroup', name: 'situsgroup', component: SitusGroupPage },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
