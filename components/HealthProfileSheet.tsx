import { useState } from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import { useMutation } from "convex/react";
import { PlusIcon, XIcon } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { Box } from "@/components/ui/box";
import { Button, ButtonIcon } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { SheetModal } from "./SheetModal";

/** Common enough in this context to be worth one tap instead of typing. */
const QUICK_ADD = [
  "Asthma",
  "Diabetes",
  "Hypertension",
  "Heart condition",
  "Pregnant",
  "COPD",
];

type HealthProfileSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Writes `users.healthConditions`, which convex/ai/systemPrompt.ts appends to
 * every system instruction. This is the one place a fact can be stated once
 * and still be true twenty messages later — the conversation window itself
 * only carries the recent exchange.
 */
export function HealthProfileSheet({
  visible,
  onClose,
}: HealthProfileSheetProps) {
  const { convexUser } = useCurrentUser();
  const updateHealthConditions = useMutation(api.users.updateHealthConditions);

  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();

  const conditions = convexUser?.healthConditions ?? [];

  const save = async (next: string[]) => {
    try {
      setError(undefined);
      await updateHealthConditions({ healthConditions: next });
    } catch (err) {
      console.error("Failed to save health conditions:", err);
      setError("Couldn't save that. Check your connection and try again.");
    }
  };

  const add = async (condition: string) => {
    const value = condition.trim();

    if (!value) return;

    const alreadyListed = conditions.some(
      (existing) => existing.toLowerCase() === value.toLowerCase(),
    );

    if (alreadyListed) {
      setDraft("");
      return;
    }

    setDraft("");
    await save([...conditions, value]);
  };

  const remove = (condition: string) =>
    save(conditions.filter((existing) => existing !== condition));

  const unusedQuickAdds = QUICK_ADD.filter(
    (suggestion) =>
      !conditions.some(
        (existing) => existing.toLowerCase() === suggestion.toLowerCase(),
      ),
  );

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Health profile"
      subtitle="Anything here is weighed on every reply, even when you don't mention it."
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack space="xl">
          <VStack space="sm">
            <HStack space="sm" className="items-end">
              <Box className="flex-1 rounded-xl border border-border bg-card px-3">
                <Input className="h-11 border-0 bg-transparent">
                  <InputField
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="e.g. Asthma"
                    className="text-foreground"
                    onSubmitEditing={() => add(draft)}
                    returnKeyType="done"
                    maxLength={80}
                  />
                </Input>
              </Box>

              <Button
                size="icon"
                onPress={() => add(draft)}
                isDisabled={!draft.trim()}
                accessibilityLabel="Add condition"
                className="rounded-full"
              >
                <ButtonIcon as={PlusIcon} size="sm" />
              </Button>
            </HStack>

            {error ? (
              <Text size="xs" className="text-destructive">
                {error}
              </Text>
            ) : null}
          </VStack>

          {conditions.length > 0 ? (
            <VStack space="sm">
              <Text
                size="xs"
                className="uppercase tracking-wide text-muted-foreground"
              >
                Saved
              </Text>

              <HStack className="flex-wrap gap-2">
                {conditions.map((condition) => (
                  <TouchableOpacity
                    key={condition}
                    onPress={() => remove(condition)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${condition}`}
                    className="rounded-full bg-muted px-3 py-2 active:bg-accent"
                  >
                    <HStack space="xs" className="items-center">
                      <Text size="sm" className="text-foreground">
                        {condition}
                      </Text>
                      <Icon
                        as={XIcon}
                        size="xs"
                        className="text-muted-foreground"
                      />
                    </HStack>
                  </TouchableOpacity>
                ))}
              </HStack>
            </VStack>
          ) : (
            <Text size="sm" className="text-muted-foreground">
              Nothing saved yet. The assistant will still answer, it just won't
              know to weigh anything in particular.
            </Text>
          )}

          {unusedQuickAdds.length > 0 && (
            <VStack space="sm">
              <Text
                size="xs"
                className="uppercase tracking-wide text-muted-foreground"
              >
                Common
              </Text>

              <HStack className="flex-wrap gap-2">
                {unusedQuickAdds.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    onPress={() => add(suggestion)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${suggestion}`}
                    className="rounded-full border border-border px-3 py-2 active:bg-accent"
                  >
                    <Text size="sm" className="text-muted-foreground">
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </HStack>
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </SheetModal>
  );
}
