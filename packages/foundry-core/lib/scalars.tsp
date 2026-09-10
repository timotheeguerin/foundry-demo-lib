namespace Foundry.Core;

@encode(DateTimeKnownEncoding.unixTimestamp, int32)
scalar FoundryTimestamp extends utcDateTime;

#suppress "@azure-tools/typespec-azure-core/known-encoding" "Foundry wire contracts encode duration values as integer milliseconds."
@doc("A duration encoded as an integer number of milliseconds.")
@encode(DurationKnownEncoding.milliseconds, int32)
scalar FoundryDurationMilliseconds extends duration;
