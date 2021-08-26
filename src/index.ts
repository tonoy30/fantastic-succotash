//#region Validator Methods
interface Validator {
	value: string | number;
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	min?: number;
	max?: number;
}
function Validate(input: Validator): boolean {
	let isValid = true;
	if (input.required) {
		isValid = isValid && input.value.toString().trim().length !== 0;
	}
	if (input.minLength !== null && typeof input.minLength === 'string') {
		isValid = isValid && input.value.toString().length >= input.minLength;
	}
	if (input.maxLength !== null && typeof input.maxLength === 'string') {
		isValid = isValid && input.value.toString().length <= input.maxLength;
	}
	if (input.min !== null && typeof input.min === 'number') {
		isValid = isValid && input.value >= input.min;
	}
	if (input.max !== null && typeof input.max === 'number') {
		isValid = isValid && input.value <= input.max;
	}

	return isValid;
}
//#endregion
//#region Decorators
function Component(obj: {
	selector: string;
	template: string;
	classes?: string[];
	position?: 'afterbegin' | 'beforeend';
}) {
	return function <T extends { new (...args: any[]): {} }>(target: T) {
		const templateEl = document.getElementById(
			obj.template
		)! as HTMLTemplateElement;
		const rootEl = document.getElementById('root')! as HTMLDivElement;
		if (templateEl && rootEl) {
			const importedNode = document.importNode(templateEl.content, true);
			const firstChild = importedNode.firstElementChild as HTMLElement;
			firstChild.id = obj.selector;
			if (obj.classes) {
				obj.classes.forEach((item) => {
					firstChild.classList.add(item);
				});
			}
			rootEl.insertAdjacentElement(
				obj.position ?? 'afterbegin',
				firstChild
			);
			return class extends target {};
		}
	};
}

function Autobind(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	const method = descriptor.value;
	const adjDescriptor: PropertyDescriptor = {
		configurable: true,
		get() {
			return method.bind(this);
		},
	};
	return adjDescriptor;
}
//#endregion
//#region Project State Class
enum ProjectStatus {
	Active,
	Finished,
}
class Project {
	private _id: string;
	constructor(
		public title: string,
		public description: string,
		public people: number,
		public status: ProjectStatus
	) {
		this._id = Math.random().toString();
	}
	get id() {
		return this._id;
	}
	set id(value: string) {
		this._id = value;
	}
	get person() {
		if (this.people === 1) {
			return '1 person assigned';
		}
		return `${this.people} persons assigned`;
	}
}
type Listener<T> = (items: T[]) => void;
class State<T> {
	private _listeners: Listener<T>[] = [];
	set listener(func: Listener<T>) {
		this._listeners.push(func);
	}
	get listeners(): Listener<T>[] {
		return this._listeners;
	}
}
class ProjectState extends State<Project> {
	private _projects: Project[] = [];
	private static _instance: ProjectState;
	private constructor() {
		super();
	}

	static get instance() {
		if (this._instance) {
			return this._instance;
		}
		this._instance = new ProjectState();
		return this._instance;
	}

	set projects(project: Project) {
		const oldProjectIdx = this._projects.findIndex(
			(p) => p.id === project.id
		);
		if (oldProjectIdx !== -1) {
			const oldProjectId = this._projects[oldProjectIdx].id;
			project.id = oldProjectId;
			this._projects[oldProjectIdx] = {
				...project,
			} as Project;
		} else {
			this._projects.push(project);
		}
		this.notifyListener();
	}
	getProjects(): Project[] {
		return this._projects;
	}
	getProjectById(id: string): Project | void {
		return this._projects.find((o) => o.id === id);
	}
	getProjectByTitle(title: string): Project | void {
		return this._projects.find((o) => o.title === title);
	}
	moveProject(projectId: string, projectStatus: ProjectStatus): void {
		const project = this.getProjects().find((o) => o.id === projectId);
		if (project && project.status !== projectStatus) {
			project.status = projectStatus;
			this.notifyListener();
		}
	}
	private notifyListener() {
		this.listeners.forEach((item) => item(this._projects.slice()));
	}
}

//#endregion
//#region Component
interface BaseComponent {
	renderContent(): void;
}
interface Draggable {
	dragStarHandler(event: DragEvent): void;
	dragEndHandler(event: DragEvent): void;
}
interface DragTarget {
	dragOverHandler(event: DragEvent): void;
	dropHandler(event: DragEvent): void;
	dragLeaveHandler(event: DragEvent): void;
}
@Component({
	selector: 'user-input',
	template: 'project-input',
})
class ProjectComponent {
	titleInput = document.querySelector('#title')! as HTMLInputElement;
	descriptionInput = document.querySelector(
		'#description'
	)! as HTMLInputElement;
	peopleInput = document.querySelector('#people')! as HTMLInputElement;
	form = document.querySelector('#user-input')! as HTMLFormElement;
	store = ProjectState.instance;
	constructor() {
		this.configure();
	}
	@Autobind
	private handleSubmit(event: Event) {
		event.preventDefault();
		const userInput = this.getUserInput();
		if (Array.isArray(userInput)) {
			const newProject = new Project(...userInput, ProjectStatus.Active);
			this.store.projects = newProject;
			this.resetForm();
		}
	}
	private configure() {
		this.form.addEventListener('submit', this.handleSubmit);
	}
	private getUserInput(): [string, string, number] | void {
		const title = this.titleInput.value;
		const description = this.descriptionInput.value;
		const people = +this.peopleInput.value;

		const titleValidator: Validator = {
			value: title,
			required: true,
		};
		const descriptionValidator: Validator = {
			value: description,
			required: true,
			minLength: 5,
		};
		const peopleValidator: Validator = {
			value: +people,
			required: true,
			min: 1,
			max: 10,
		};
		if (
			Validate(titleValidator) &&
			Validate(descriptionValidator) &&
			Validate(peopleValidator)
		) {
			return [title, description, people];
		} else {
			alert('Invalid Input Please tyy again');
			return;
		}
	}
	private resetForm() {
		this.titleInput.value = '';
		this.descriptionInput.value = '';
		this.peopleInput.value = '';
	}
}
class ProjectItem implements Draggable {
	project: Project | undefined;
	constructor() {}
	@Autobind
	dragStarHandler(event: DragEvent): void {
		event.dataTransfer!.setData('text/plain', this.project!.id);
		event.dataTransfer!.effectAllowed = 'move';
	}
	@Autobind
	dragEndHandler(event: DragEvent): void {
		console.log('dragEndHandler');
	}
	renderProject(hostId: string, projects: Project[]) {
		const listEl = document.getElementById(hostId)! as HTMLUListElement;
		listEl.addEventListener('dragstart', this.dragStarHandler);
		listEl.addEventListener('dragend', this.dragEndHandler);
		listEl.innerHTML = '';
		projects.forEach((project) => {
			this.project = project;
			const listItem = document.createElement('li');
			listItem.draggable = true;
			listItem.id = project.id;
			const h2 = document.createElement('h2');
			h2.textContent = project.title;
			listItem.appendChild(h2);
			const h3 = document.createElement('h3');
			h3.textContent = project.description;
			listItem.appendChild(h3);
			const p = document.createElement('p');
			p.textContent = project.person;
			listItem.appendChild(p);
			listEl.appendChild(listItem);
		});
	}
}
@Component({
	selector: 'active-project-list',
	template: 'project-list',
	position: 'beforeend',
})
class ProjectListComponent extends ProjectItem
	implements BaseComponent, DragTarget {
	type = 'active';
	listId = `#${this.type}-project-list`;
	projectListEl = document.querySelector(this.listId)!;
	store = ProjectState.instance;
	projects: Project[] = [];
	constructor() {
		super();
		this.renderContent();
		this.store.listener = (projects: Project[]) => {
			this.projects = projects.filter(
				(item) => item.status === ProjectStatus.Active
			);
			console.log(this.projects);
			this.renderProject('active-project-list-item', this.projects);
		};
	}
	@Autobind
	dragOverHandler(event: DragEvent): void {
		if (
			event.dataTransfer &&
			event.dataTransfer.types[0] === 'text/plain'
		) {
			event.preventDefault();
			const listEl = this.projectListEl.querySelector(
				'ul'
			)! as HTMLUListElement;
			listEl.classList.add('droppable');
		}
	}
	@Autobind
	dropHandler(event: DragEvent): void {
		const data = event.dataTransfer!.getData('text/plain');
		this.store.moveProject(data, ProjectStatus.Active);
	}
	@Autobind
	dragLeaveHandler(event: DragEvent): void {
		const listEl = this.projectListEl.querySelector(
			'ul'
		)! as HTMLUListElement;
		listEl.classList.remove('droppable');
	}
	renderContent() {
		const listEl = document.querySelector(
			`${this.listId} > ul`
		)! as HTMLUListElement;
		listEl.id = 'active-project-list-item';
		document.querySelector(`${this.listId} > header > h2`)!.textContent =
			this.type.toUpperCase() + ' PROJECTS';
		listEl.addEventListener('dragover', this.dragOverHandler);
		listEl.addEventListener('dragleave', this.dragLeaveHandler);
		listEl.addEventListener('drop', this.dropHandler);
	}
}

@Component({
	selector: 'finished-project-list',
	template: 'project-list',
	classes: ['finished-projects'],
	position: 'beforeend',
})
class FinishedProjectListComponent extends ProjectItem
	implements BaseComponent, DragTarget {
	type = 'finished';
	listId = `#${this.type}-project-list`;
	projectListEl = document.querySelector(this.listId)!;
	projects: Project[] = [];
	store = ProjectState.instance;
	constructor() {
		super();
		this.renderContent();
		this.store.listener = (projects: Project[]) => {
			this.projects = projects.filter(
				(item) => item.status === ProjectStatus.Finished
			);
			console.log(this.projects);
			this.renderProject('finished-project-list-item', this.projects);
		};
	}
	@Autobind
	dragOverHandler(event: DragEvent): void {
		if (
			event.dataTransfer &&
			event.dataTransfer.types[0] === 'text/plain'
		) {
			event.preventDefault();
			const listEl = this.projectListEl.querySelector(
				'ul'
			)! as HTMLUListElement;
			listEl.classList.add('droppable');
		}
	}
	@Autobind
	dropHandler(event: DragEvent): void {
		const data = event.dataTransfer!.getData('text/plain');
		this.store.moveProject(data, ProjectStatus.Finished);
	}
	@Autobind
	dragLeaveHandler(event: DragEvent): void {
		const listEl = this.projectListEl.querySelector(
			'ul'
		)! as HTMLUListElement;
		listEl.classList.remove('droppable');
	}

	renderContent() {
		const listEl = document.querySelector(
			`${this.listId} > ul`
		)! as HTMLUListElement;
		listEl.id = 'finished-project-list-item';
		document.querySelector(`${this.listId} > header > h2`)!.textContent =
			this.type.toUpperCase() + ' PROJECTS';
		listEl.addEventListener('dragover', this.dragOverHandler);
		listEl.addEventListener('dragleave', this.dragLeaveHandler);
		listEl.addEventListener('drop', this.dropHandler);
	}
}
//#endregion

//#region Component Instantiations
const projectInput = new ProjectComponent();
console.log(projectInput);
const projectList = new ProjectListComponent();
const finishedProjectList = new FinishedProjectListComponent();
console.log(projectList);
console.log(finishedProjectList);
//#endregion
