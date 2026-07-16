import { relations } from "drizzle-orm/relations";
import { users, sessions, documents, conversionJobs, artifacts, validationFindings, jobEvents, modelCalls, authSessions, accounts } from "./schema";

export const authSessionsRelations = relations(authSessions, ({one}) => ({
	user: one(users, {
		fields: [authSessions.userId],
		references: [users.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one, many}) => ({
	user: one(users, {
		fields: [sessions.ownerUserId],
		references: [users.id]
	}),
	documents: many(documents),
}));

export const usersRelations = relations(users, ({many}) => ({
	sessions: many(sessions),
	documents: many(documents),
	conversionJobs_requestedByUserId: many(conversionJobs, {
		relationName: "conversionJobs_requestedByUserId_users_id"
	}),
	conversionJobs_reviewedByUserId: many(conversionJobs, {
		relationName: "conversionJobs_reviewedByUserId_users_id"
	}),
	authSessions: many(authSessions),
	accounts: many(accounts),
}));

export const documentsRelations = relations(documents, ({one, many}) => ({
	document: one(documents, {
		fields: [documents.replacedByDocumentId],
		references: [documents.id],
		relationName: "documents_replacedByDocumentId_documents_id"
	}),
	documents: many(documents, {
		relationName: "documents_replacedByDocumentId_documents_id"
	}),
	session: one(sessions, {
		fields: [documents.sessionId],
		references: [sessions.id]
	}),
	user: one(users, {
		fields: [documents.uploadedByUserId],
		references: [users.id]
	}),
	conversionJobs: many(conversionJobs),
}));

export const artifactsRelations = relations(artifacts, ({one}) => ({
	conversionJob: one(conversionJobs, {
		fields: [artifacts.jobId],
		references: [conversionJobs.id]
	}),
}));

export const conversionJobsRelations = relations(conversionJobs, ({one, many}) => ({
	artifacts: many(artifacts),
	validationFindings: many(validationFindings),
	jobEvents: many(jobEvents),
	modelCalls: many(modelCalls),
	document: one(documents, {
		fields: [conversionJobs.documentId],
		references: [documents.id]
	}),
	user_requestedByUserId: one(users, {
		fields: [conversionJobs.requestedByUserId],
		references: [users.id],
		relationName: "conversionJobs_requestedByUserId_users_id"
	}),
	user_reviewedByUserId: one(users, {
		fields: [conversionJobs.reviewedByUserId],
		references: [users.id],
		relationName: "conversionJobs_reviewedByUserId_users_id"
	}),
}));

export const validationFindingsRelations = relations(validationFindings, ({one}) => ({
	conversionJob: one(conversionJobs, {
		fields: [validationFindings.jobId],
		references: [conversionJobs.id]
	}),
}));

export const jobEventsRelations = relations(jobEvents, ({one}) => ({
	conversionJob: one(conversionJobs, {
		fields: [jobEvents.jobId],
		references: [conversionJobs.id]
	}),
}));

export const modelCallsRelations = relations(modelCalls, ({one}) => ({
	conversionJob: one(conversionJobs, {
		fields: [modelCalls.jobId],
		references: [conversionJobs.id]
	}),
}));