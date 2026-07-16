import { Show } from "@clerk/nextjs";
import TaskBoard from "./TaskBoard";
import { AuthGateway } from "./components/AuthGateway";

export default function Home() {
  return (
    <>
      <Show when="signed-out">
        <AuthGateway />
      </Show>
      <Show when="signed-in">
        <TaskBoard />
      </Show>
    </>
  );
}
