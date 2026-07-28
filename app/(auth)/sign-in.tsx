import React, { useEffect } from "react";
import { useSignIn, useUser } from "@clerk/expo";
import { type Href, Link, useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Compass } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const syncUser = useMutation(api.users.syncUser);
  const [isSynced, setIsSynced] = React.useState(false);
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  useEffect(() => {
    const synchronize = async () => {
      if (!isLoaded || !user || isSynced) return;

      try {
        await syncUser({
          clerkUserId: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? "",
          displayName: user.fullName ?? undefined,
        });

        setIsSynced(true);

        router.replace("/home");
      } catch (err) {
        console.error("Failed to sync user:", err);
      }
    };

    synchronize();
  }, [isLoaded, user, isSynced, syncUser, router]);

  const handleSubmit = async () => {
    const { error } = await signIn.password({
      emailAddress,
      password,
    });
    if (error) {
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session }) => {
          if (session?.currentTask) {
            console.log(session.currentTask);
          }
        },
      });
    } else if (signIn.status === "needs_second_factor") {
    } else if (signIn.status === "needs_client_trust") {
      const emailCodeFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "email_code",
      );

      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
      }
    } else {
      console.error("Sign-in attempt not complete:", signIn);
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code });

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session }) => {
          if (session?.currentTask) {
            console.log(session.currentTask);
          }
        },
      });
    } else {
      console.error("Sign-in attempt not complete:", signIn);
    }
  };

  const isFetching = fetchStatus === "fetching";

  if (signIn.status === "needs_client_trust") {
    return (
      <Box className="flex-1 justify-center px-5 py-8 bg-[#F5F1E6]">
        <Box className="bg-[#FBF8F1] border border-[#E4D9C4] rounded-2xl px-6 py-7 shadow-md">
          <VStack space="xs" className="items-center mb-5">
            <Box className="w-14 h-14 rounded-full bg-[#BF4E27] items-center justify-center mb-1">
              <Compass size={26} className="text-[#F5F1E6]" />
            </Box>
            <Text className="text-[#1F3A2E] text-lg font-bold">
              Travel Health Guide
            </Text>
            <Text className="text-[#6B5F52] text-xs">
              Your personal trip advisor
            </Text>
            <Box className="w-full border-t border-dashed border-[#C08552]/50 mt-4" />
          </VStack>

          <VStack space="md">
            <VStack space="xs" className="mb-2">
              <Heading size="xl" className="text-[#1F3A2E]">
                Verify your account
              </Heading>
              <Box className="h-1 w-10 rounded-full bg-[#BF4E27]" />
            </VStack>

            <Input
              size="md"
              variant="outline"
              className="bg-[#F5F1E6] border-[#E4D9C4] rounded-xl data-[focus=true]:border-[#1F3A2E]"
            >
              <InputField
                value={code}
                placeholder="Enter your verification code"
                placeholderTextColor="#9C8F7E"
                onChangeText={setCode}
                keyboardType="numeric"
                className="text-[#2A2420]"
              />
            </Input>

            {errors?.fields?.code && (
              <Text className="text-sm text-[#A23B2D] -mt-2">
                {errors.fields.code.message}
              </Text>
            )}

            <Button
              className="mt-2 bg-[#BF4E27] rounded-xl active:bg-[#9C3D1D]"
              isDisabled={isFetching}
              onPress={handleVerify}
            >
              <ButtonText className="text-[#F5F1E6] font-semibold uppercase tracking-wide">
                Verify
              </ButtonText>
            </Button>

            <Button variant="link" onPress={() => signIn.mfa.sendEmailCode()}>
              <ButtonText className="text-[#1F3A2E] font-medium">
                I need a new code
              </ButtonText>
            </Button>

            <Button variant="link" onPress={() => signIn.reset()}>
              <ButtonText className="text-[#1F3A2E] font-medium">
                Start over
              </ButtonText>
            </Button>
          </VStack>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="flex-1 justify-center px-5 py-8 bg-[#F5F1E6]">
      <Box className="bg-[#FBF8F1] border border-[#E4D9C4] rounded-2xl px-6 py-7 shadow-md">
        <VStack space="xs" className="items-center mb-5">
          <Box className="w-14 h-14 rounded-full bg-[#BF4E27] items-center justify-center mb-1">
            <Compass size={26} className="text-[#F5F1E6]" />
          </Box>
          <Text className="text-[#1F3A2E] text-lg font-bold">
            Travel Health Guide
          </Text>
          <Text className="text-[#6B5F52] text-xs">
            Your personal trip advisor
          </Text>
          <Box className="w-full border-t border-dashed border-[#C08552]/50 mt-4" />
        </VStack>

        <VStack space="md">
          <VStack space="xs" className="mb-2">
            <Heading size="xl" className="text-[#1F3A2E]">
              Sign in
            </Heading>
            <Box className="h-1 w-10 rounded-full bg-[#BF4E27]" />
            <Text size="sm" className="text-[#6B5F52] mt-1">
              Pick up your trip where you left off.
            </Text>
          </VStack>

          <VStack space="xs">
            <Text
              size="xs"
              className="font-semibold uppercase tracking-widest text-[#6B5F52]"
            >
              Email address
            </Text>
            <Input
              size="md"
              variant="outline"
              className="bg-[#F5F1E6] border-[#E4D9C4] rounded-xl data-[focus=true]:border-[#1F3A2E]"
            >
              <InputField
                autoCapitalize="none"
                value={emailAddress}
                placeholder="Enter email"
                placeholderTextColor="#9C8F7E"
                onChangeText={setEmailAddress}
                keyboardType="email-address"
                className="text-[#2A2420]"
              />
            </Input>
            {errors?.fields?.identifier && (
              <Text className="text-xs text-[#A23B2D]">
                {errors.fields.identifier.message}
              </Text>
            )}
          </VStack>

          <VStack space="xs">
            <Text
              size="xs"
              className="font-semibold uppercase tracking-widest text-[#6B5F52]"
            >
              Password
            </Text>
            <Input
              size="md"
              variant="outline"
              className="bg-[#F5F1E6] border-[#E4D9C4] rounded-xl data-[focus=true]:border-[#1F3A2E]"
            >
              <InputField
                value={password}
                placeholder="Enter password"
                placeholderTextColor="#9C8F7E"
                secureTextEntry={true}
                onChangeText={setPassword}
                className="text-[#2A2420]"
              />
            </Input>
            {errors?.fields?.password && (
              <Text className="text-xs text-[#A23B2D]">
                {errors.fields.password.message}
              </Text>
            )}
          </VStack>

          <Button
            className="mt-2 bg-[#BF4E27] rounded-xl active:bg-[#9C3D1D]"
            isDisabled={!emailAddress || !password || isFetching}
            onPress={handleSubmit}
          >
            <ButtonText className="text-[#F5F1E6] font-semibold uppercase tracking-wide">
              Continue
            </ButtonText>
          </Button>

          <HStack space="xs" className="mt-3 items-center justify-center">
            <Text className="text-[#6B5F52]">Don't have an account?</Text>
            <Link href="/sign-up" asChild>
              <Button variant="link" className="p-0 h-auto">
                <ButtonText className="text-[#1F3A2E] underline font-medium">
                  Sign up
                </ButtonText>
              </Button>
            </Link>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
}
