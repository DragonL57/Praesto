"use client";

import type { User } from "next-auth";
import { useRouter, usePathname } from "next/navigation";

import { SidebarHistory } from "./sidebar-history";
import { SidebarUserNav } from "./sidebar-user-nav";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { PiNotePencilBold } from "react-icons/pi";

export function AppSidebar({ user }: { user: User | undefined }) {
	const router = useRouter();
	const pathname = usePathname();
	const { setOpenMobile, open } = useSidebar();

	return (
		<Sidebar className="group-data-[side=left]:border-r-0">
			<SidebarHeader className="relative py-2.5">
				<SidebarMenu>
					<li className="list-none">
						<div
							className={`flex flex-row justify-between items-center ${
								open ? "" : "absolute inset-x-0 px-2"
							}`}
						>
							<Link
								href="/chat"
								onClick={() => {
									setOpenMobile(false);
								}}
								className="flex flex-row gap-3 items-center"
							>
								<div className="flex items-center gap-2">
									<span className="p-2 text-xl font-semibold hover:bg-muted rounded-md cursor-pointer whitespace-nowrap">
										UniTask
										<span className="text-[hsl(var(--primary))]">AI</span>
									</span>
								</div>
							</Link>
							{open && (
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											type="button"
											className="p-3 size-11"
											onClick={() => {
												router.push("/chat");
												router.refresh();
											}}
											style={{ display: pathname === "/chat" || pathname === "/chat/new" ? "none" : "inline-flex" }}
										>
											<PiNotePencilBold size={20} />
											<span className="sr-only">New Chat</span>
										</Button>
									</TooltipTrigger>
									<TooltipContent align="end">New Chat</TooltipContent>
								</Tooltip>
							)}
						</div>
					</li>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarHistory user={user} />
			</SidebarContent>
			<SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
		</Sidebar>
	);
}
