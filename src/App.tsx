import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { MutationFeedbackProvider } from "@/context/mutation-feedback-context";
import { AppRoutes } from "@/routes";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MutationFeedbackProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster richColors position="top-right" closeButton />
        </BrowserRouter>
      </MutationFeedbackProvider>
    </QueryClientProvider>
  );
}
